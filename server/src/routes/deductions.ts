import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { canTransition } from '../lib/workflow.js';
import { Prisma } from '@prisma/client';

const router = Router();

// ─── Normalization helpers ───
function normalizeInvoice(raw: string | null | undefined): string | null {
  if (!raw) return null;
  // Strip whitespace, uppercase, remove non-alphanumeric except hyphens
  const cleaned = raw.trim().toUpperCase().replace(/[^A-Z0-9\-]/g, '');
  return cleaned || null;
}

function validateAmount(val: any): number | null {
  const n = Number(val);
  if (isNaN(n) || n < 0) return null;
  return Math.round(n * 100) / 100; // round to 2 decimals
}

// GET /api/deductions — list with filtering, pagination, sorting
router.get('/', async (req, res) => {
  const {
    companyId, status, retailerId, reasonId, search,
    sort = 'deductedAt:desc', page = '1', limit = '50',
    includeDeleted = 'false',
  } = req.query as Record<string, string>;

  const where: Prisma.DeductionWhereInput = {};
  if (includeDeleted !== 'true') where.isDeleted = false;
  if (companyId) where.companyId = parseInt(companyId);
  if (status) where.status = { in: status.split(',') };
  if (retailerId) where.retailerId = parseInt(retailerId);
  if (reasonId) where.reasonId = parseInt(reasonId);
  if (search) {
    where.OR = [
      { invoiceNumber: { contains: search, mode: 'insensitive' } },
      { notes: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [sortField, sortDir] = sort.split(':');
  const orderBy: Prisma.DeductionOrderByWithRelationInput = {
    [sortField!]: sortDir === 'asc' ? 'asc' : 'desc',
  };

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const [deductions, total] = await Promise.all([
    prisma.deduction.findMany({
      where, orderBy, skip, take,
      include: {
        company: true, retailer: true, reason: true,
        activities: {
          where: { user: { role: { not: 'system' } } },
          select: { user: { select: { id: true, name: true } } },
          distinct: ['userId'],
        },
      },
    }),
    prisma.deduction.count({ where }),
  ]);

  const data = deductions.map(d => ({
    ...d,
    handledBy: d.activities.map(a => a.user),
    activities: undefined,
  }));

  res.json({ data, total, page: parseInt(page), limit: parseInt(limit) });
});

// GET /api/deductions/:id — single deduction with activities
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id!);
  const deduction = await prisma.deduction.findUnique({
    where: { id },
    include: {
      company: true, retailer: true, reason: true,
      activities: { include: { user: true }, orderBy: { createdAt: 'desc' } },
    },
  });
  if (!deduction) return res.status(404).json({ error: 'Not found' });
  res.json(deduction);
});

// PATCH /api/deductions/:id/triage — accept, dispute, or park
router.patch('/:id/triage', async (req, res) => {
  const id = parseInt(req.params.id!);
  const userId = req.user!.userId;
  const { action, notes, attachments } = req.body as { action: string; notes?: string; attachments?: any[] };

  if (!['accept', 'dispute', 'park'].includes(action)) {
    return res.status(400).json({ error: 'Invalid triage action' });
  }
  if (!notes?.trim()) {
    return res.status(400).json({ error: 'Notes are required to explain this action' });
  }

  const deduction = await prisma.deduction.findUnique({ where: { id } });
  if (!deduction) return res.status(404).json({ error: 'Not found' });
  if (deduction.status !== 'open') {
    return res.status(400).json({ error: `Cannot triage from status: ${deduction.status}` });
  }

  const statusMap: Record<string, string> = {
    accept: 'accepted', dispute: 'in_dispute', park: 'parked',
  };
  const newStatus = statusMap[action]!;

  const updated = await prisma.$transaction(async (tx) => {
    const d = await tx.deduction.update({ where: { id }, data: { status: newStatus } });
    await tx.activityLog.create({
      data: {
        deductionId: id, userId,
        action: `triage_${action}`, fromStatus: 'open', toStatus: newStatus,
        details: { notes: notes!.trim() },
        attachments: attachments?.length ? attachments : undefined,
      },
    });
    return d;
  });

  res.json(updated);
});

// PATCH /api/deductions/:id/status — advance through pipeline
router.patch('/:id/status', async (req, res) => {
  const id = parseInt(req.params.id!);
  const userId = req.user!.userId;
  const { status: newStatus, notes, attachments } = req.body as { status: string; notes?: string; attachments?: any[] };

  if (!notes?.trim()) {
    return res.status(400).json({ error: 'Notes are required to explain this action' });
  }

  const deduction = await prisma.deduction.findUnique({ where: { id } });
  if (!deduction) return res.status(404).json({ error: 'Not found' });
  if (!canTransition(deduction.status, newStatus)) {
    return res.status(400).json({ error: `Cannot transition from ${deduction.status} to ${newStatus}` });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const d = await tx.deduction.update({ where: { id }, data: { status: newStatus } });
    await tx.activityLog.create({
      data: {
        deductionId: id, userId, action: 'status_change',
        fromStatus: deduction.status, toStatus: newStatus,
        details: { notes: notes!.trim() },
        attachments: attachments?.length ? attachments : undefined,
      },
    });
    return d;
  });

  res.json(updated);
});

// PATCH /api/deductions/:id/resolve — resolve a dispute
router.patch('/:id/resolve', async (req, res) => {
  const id = parseInt(req.params.id!);
  const userId = req.user!.userId;
  const { resolutionType, recoveredAmount, notes, attachments } = req.body as {
    resolutionType: 'won' | 'lost' | 'partial';
    recoveredAmount?: number;
    notes?: string;
    attachments?: any[];
  };

  if (!['won', 'lost', 'partial'].includes(resolutionType)) {
    return res.status(400).json({ error: 'Invalid resolution type' });
  }
  if (!notes?.trim()) {
    return res.status(400).json({ error: 'Notes are required to explain the resolution' });
  }

  const deduction = await prisma.deduction.findUnique({ where: { id } });
  if (!deduction) return res.status(404).json({ error: 'Not found' });
  if (deduction.status !== 'dispute_filed') {
    return res.status(400).json({ error: 'Can only resolve from dispute_filed status' });
  }

  const newStatus = `resolved_${resolutionType}`;
  const recovered = resolutionType === 'won'
    ? deduction.amount
    : resolutionType === 'partial'
      ? (recoveredAmount ?? 0)
      : 0;

  const updated = await prisma.$transaction(async (tx) => {
    const d = await tx.deduction.update({
      where: { id },
      data: {
        status: newStatus,
        resolutionType, recoveredAmount: recovered,
        resolutionNotes: notes ?? null,
      },
    });
    await tx.activityLog.create({
      data: {
        deductionId: id, userId, action: `resolve_${resolutionType}`,
        fromStatus: 'dispute_filed', toStatus: newStatus,
        details: { resolutionType, recoveredAmount: Number(recovered), notes: notes!.trim() },
        attachments: attachments?.length ? attachments : undefined,
      },
    });
    return d;
  });

  res.json(updated);
});

// PATCH /api/deductions/:id/close
router.patch('/:id/close', async (req, res) => {
  const id = parseInt(req.params.id!);
  const userId = req.user!.userId;
  const { notes, attachments } = req.body as { notes?: string; attachments?: any[] };

  if (!notes?.trim()) {
    return res.status(400).json({ error: 'Notes are required to close this deduction' });
  }

  const deduction = await prisma.deduction.findUnique({ where: { id } });
  if (!deduction) return res.status(404).json({ error: 'Not found' });
  if (!canTransition(deduction.status, 'closed')) {
    return res.status(400).json({ error: `Cannot close from status: ${deduction.status}` });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const d = await tx.deduction.update({ where: { id }, data: { status: 'closed' } });
    await tx.activityLog.create({
      data: {
        deductionId: id, userId, action: 'close',
        fromStatus: deduction.status, toStatus: 'closed',
        details: { notes: notes!.trim() },
        attachments: attachments?.length ? attachments : undefined,
      },
    });
    return d;
  });

  res.json(updated);
});

// PATCH /api/deductions/:id/unpark — move parked back to open
router.patch('/:id/unpark', async (req, res) => {
  const id = parseInt(req.params.id!);
  const userId = req.user!.userId;
  const { notes, attachments } = req.body as { notes?: string; attachments?: any[] };

  if (!notes?.trim()) {
    return res.status(400).json({ error: 'Notes are required to explain why you are un-parking' });
  }

  const deduction = await prisma.deduction.findUnique({ where: { id } });
  if (!deduction) return res.status(404).json({ error: 'Not found' });
  if (deduction.status !== 'parked') {
    return res.status(400).json({ error: 'Can only unpark from parked status' });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const d = await tx.deduction.update({ where: { id }, data: { status: 'open' } });
    await tx.activityLog.create({
      data: {
        deductionId: id, userId, action: 'unpark',
        fromStatus: 'parked', toStatus: 'open',
        details: { notes: notes!.trim() },
        attachments: attachments?.length ? attachments : undefined,
      },
    });
    return d;
  });

  res.json(updated);
});

// POST /api/deductions/:id/notes — add a note
router.post('/:id/notes', async (req, res) => {
  const id = parseInt(req.params.id!);
  const userId = req.user!.userId;
  const { notes } = req.body as { notes: string };

  const deduction = await prisma.deduction.findUnique({ where: { id } });
  if (!deduction) return res.status(404).json({ error: 'Not found' });

  await prisma.activityLog.create({
    data: {
      deductionId: id, userId, action: 'note_added',
      fromStatus: deduction.status, toStatus: deduction.status,
      details: { notes },
    },
  });

  res.json({ success: true });
});

// PATCH /api/deductions/:id — edit deduction fields
router.patch('/:id', async (req, res) => {
  const id = parseInt(req.params.id!);
  const userId = req.user!.userId;
  const { companyId, retailerId, reasonId, invoiceNumber, amount, deductedAt } = req.body as {
    companyId?: number | null;
    retailerId?: number | null;
    reasonId?: number | null;
    invoiceNumber?: string | null;
    amount?: number;
    deductedAt?: string | null;
  };

  const deduction = await prisma.deduction.findUnique({ where: { id } });
  if (!deduction) return res.status(404).json({ error: 'Not found' });

  const changes: Record<string, { from: any; to: any }> = {};
  const data: any = {};

  if (companyId !== undefined && companyId !== deduction.companyId) {
    changes.companyId = { from: deduction.companyId, to: companyId };
    data.companyId = companyId;
  }
  if (retailerId !== undefined && retailerId !== deduction.retailerId) {
    changes.retailerId = { from: deduction.retailerId, to: retailerId };
    data.retailerId = retailerId;
  }
  if (reasonId !== undefined && reasonId !== deduction.reasonId) {
    changes.reasonId = { from: deduction.reasonId, to: reasonId };
    data.reasonId = reasonId;
  }
  if (invoiceNumber !== undefined) {
    const cleaned = normalizeInvoice(invoiceNumber);
    if (cleaned !== deduction.invoiceNumber) {
      changes.invoiceNumber = { from: deduction.invoiceNumber, to: cleaned };
      data.invoiceNumber = cleaned;
    }
  }
  if (amount !== undefined) {
    const cleanedAmt = validateAmount(amount);
    if (cleanedAmt !== null && cleanedAmt !== Number(deduction.amount)) {
      changes.amount = { from: Number(deduction.amount), to: cleanedAmt };
      data.amount = cleanedAmt;
    }
  }
  if (deductedAt !== undefined) {
    const newDate = deductedAt ? new Date(deductedAt) : null;
    const oldDate = deduction.deductedAt;
    if ((newDate?.getTime() ?? null) !== (oldDate?.getTime() ?? null)) {
      changes.deductedAt = { from: oldDate, to: newDate };
      data.deductedAt = newDate;
    }
  }

  if (Object.keys(data).length === 0) {
    return res.json(deduction);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const d = await tx.deduction.update({ where: { id }, data });
    await tx.activityLog.create({
      data: {
        deductionId: id, userId, action: 'edited',
        fromStatus: deduction.status, toStatus: deduction.status,
        details: { changes },
      },
    });
    return d;
  });

  res.json(updated);
});

// POST /api/deductions/check-duplicate — check for potential duplicates
router.post('/check-duplicate', async (req, res) => {
  const { retailerId, invoiceNumber, amount, deductedAt } = req.body as {
    retailerId?: number; invoiceNumber?: string; amount?: number; deductedAt?: string;
  };

  const where: Prisma.DeductionWhereInput = { isDeleted: false };
  if (retailerId) where.retailerId = retailerId;
  if (invoiceNumber) where.invoiceNumber = normalizeInvoice(invoiceNumber);
  if (amount) where.amount = validateAmount(amount) ?? undefined;
  if (deductedAt) {
    const d = new Date(deductedAt);
    if (!isNaN(d.getTime())) {
      const start = new Date(d); start.setHours(0, 0, 0, 0);
      const end = new Date(d); end.setHours(23, 59, 59, 999);
      where.deductedAt = { gte: start, lte: end };
    }
  }

  const matches = await prisma.deduction.findMany({
    where,
    take: 5,
    include: { company: true, retailer: true },
  });

  res.json({ duplicates: matches });
});

// POST /api/deductions — create a new deduction manually
router.post('/', async (req, res) => {
  const userId = req.user!.userId;
  const { companyId, retailerId, reasonId, invoiceNumber, amount, deductedAt, notes } = req.body as {
    companyId: number;
    retailerId: number;
    reasonId?: number;
    invoiceNumber?: string;
    amount: number;
    deductedAt: string;
    notes?: string;
  };

  const cleanedAmount = validateAmount(amount);
  if (!companyId || !retailerId || cleanedAmount === null || !deductedAt) {
    return res.status(400).json({ error: 'Company, retailer, amount (≥ 0), and date are required' });
  }

  const cleanedInvoice = normalizeInvoice(invoiceNumber);

  // Auto-assign next ID
  const maxId = await prisma.deduction.findFirst({ orderBy: { id: 'desc' }, select: { id: true } });
  const newId = (maxId?.id ?? 0) + 1;

  const deduction = await prisma.$transaction(async (tx) => {
    const d = await tx.deduction.create({
      data: {
        id: newId,
        companyId,
        retailerId,
        reasonId: reasonId ?? null,
        invoiceNumber: cleanedInvoice,
        amount: cleanedAmount,
        deductedAt: new Date(deductedAt),
        status: 'open',
        notes: notes?.trim() ?? null,
      },
    });
    await tx.activityLog.create({
      data: {
        deductionId: newId, userId, action: 'created',
        fromStatus: null, toStatus: 'open',
        details: notes ? { notes } : { notes: 'Manually created' },
      },
    });
    return d;
  });

  res.status(201).json(deduction);
});

// POST /api/deductions/upload — bulk upload from CSV
router.post('/upload', async (req, res) => {
  const userId = req.user!.userId;
  const rows = req.body as Array<{
    company_id: number;
    retailer_id: number;
    reason_id?: number;
    invoice_number?: string;
    amount: number;
    deducted_at: string;
    notes?: string;
  }>;

  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: 'Expected a non-empty array of deductions' });
  }

  // Validate all company_ids and retailer_ids exist
  const validCompanies = new Set((await prisma.company.findMany({ select: { id: true } })).map(c => c.id));
  const validRetailers = new Set((await prisma.retailer.findMany({ select: { id: true } })).map(r => r.id));

  const errors: string[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    if (!row.company_id || !validCompanies.has(row.company_id)) {
      errors.push(`Row ${i + 1}: invalid company_id ${row.company_id}`);
    }
    if (!row.retailer_id || !validRetailers.has(row.retailer_id)) {
      errors.push(`Row ${i + 1}: invalid retailer_id ${row.retailer_id}`);
    }
    if (validateAmount(row.amount) === null) {
      errors.push(`Row ${i + 1}: invalid amount (must be a non-negative number)`);
    }
    if (!row.deducted_at) {
      errors.push(`Row ${i + 1}: missing deducted_at`);
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: 'Validation failed', details: errors.slice(0, 20) });
  }

  const maxId = await prisma.deduction.findFirst({ orderBy: { id: 'desc' }, select: { id: true } });
  let nextId = (maxId?.id ?? 0) + 1;
  let created = 0;

  for (const row of rows) {
    const id = nextId++;
    const parsedDate = new Date(row.deducted_at);

    await prisma.$transaction(async (tx) => {
      await tx.deduction.create({
        data: {
          id,
          companyId: row.company_id,
          retailerId: row.retailer_id,
          reasonId: row.reason_id ?? null,
          invoiceNumber: normalizeInvoice(row.invoice_number),
          amount: validateAmount(row.amount) ?? 0,
          deductedAt: isNaN(parsedDate.getTime()) ? null : parsedDate,
          status: 'open',
          notes: row.notes?.trim() ?? null,
        },
      });
      await tx.activityLog.create({
        data: {
          deductionId: id, userId, action: 'created',
          fromStatus: null, toStatus: 'open',
          details: { notes: 'Uploaded via CSV import' },
        },
      });
    });
    created++;
  }

  res.status(201).json({ created, message: `${created} deductions imported successfully` });
});

export default router;
