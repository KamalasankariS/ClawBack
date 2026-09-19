import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { Prisma } from '@prisma/client';

const router = Router();

// GET /api/dashboard/summary
router.get('/summary', async (req, res) => {
  const companyId = req.query.companyId ? parseInt(req.query.companyId as string) : undefined;

  const where: Prisma.DeductionWhereInput = { isDeleted: false };
  if (companyId) where.companyId = companyId;

  const deductions = await prisma.deduction.findMany({
    where,
    select: { amount: true, status: true, recoveredAmount: true },
  });

  let totalAmount = 0;
  let inDisputeCount = 0, inDisputeAmount = 0;
  let resolvedCount = 0;
  let totalRecovered = 0;
  let acceptedCount = 0, acceptedAmount = 0;
  let openCount = 0, parkedCount = 0;

  const disputeStatuses = ['in_dispute', 'dispute_filed'];
  const resolvedStatuses = ['resolved_won', 'resolved_lost', 'resolved_partial', 'closed'];

  for (const d of deductions) {
    const amt = Number(d.amount);
    totalAmount += amt;

    if (disputeStatuses.includes(d.status)) {
      inDisputeCount++;
      inDisputeAmount += amt;
    } else if (resolvedStatuses.includes(d.status)) {
      resolvedCount++;
      totalRecovered += Number(d.recoveredAmount ?? 0);
    } else if (d.status === 'accepted') {
      acceptedCount++;
      acceptedAmount += amt;
    } else if (d.status === 'open') {
      openCount++;
    } else if (d.status === 'parked') {
      parkedCount++;
    }
  }

  const resolvedPool = deductions
    .filter(d => resolvedStatuses.includes(d.status))
    .reduce((sum, d) => sum + Number(d.amount), 0);

  const recoveryRate = resolvedPool > 0 ? (totalRecovered / resolvedPool) * 100 : 0;

  // Period-over-period: last 30 days vs prior 30 days
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const recentWhere: Prisma.DeductionWhereInput = { ...where, createdAt: { gte: thirtyDaysAgo } };
  const priorWhere: Prisma.DeductionWhereInput = { ...where, createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } };

  const [recentDeductions, priorDeductions] = await Promise.all([
    prisma.deduction.findMany({ where: recentWhere, select: { amount: true, status: true, recoveredAmount: true } }),
    prisma.deduction.findMany({ where: priorWhere, select: { amount: true, status: true, recoveredAmount: true } }),
  ]);

  const calcPeriod = (deds: typeof deductions) => {
    let amt = 0, disputed = 0, recovered = 0;
    for (const d of deds) {
      amt += Number(d.amount);
      if (disputeStatuses.includes(d.status)) disputed += Number(d.amount);
      if (resolvedStatuses.includes(d.status)) recovered += Number(d.recoveredAmount ?? 0);
    }
    return { amount: amt, disputed, recovered, count: deds.length };
  };

  const recent = calcPeriod(recentDeductions);
  const prior = calcPeriod(priorDeductions);

  // Trend direction: 'up' | 'down' | 'flat'
  const trend = (curr: number, prev: number) => curr > prev ? 'up' : curr < prev ? 'down' : 'flat';

  res.json({
    totalDeductions: deductions.length,
    totalAmount: Math.round(totalAmount * 100) / 100,
    inDisputeCount, inDisputeAmount: Math.round(inDisputeAmount * 100) / 100,
    resolvedCount, totalRecovered: Math.round(totalRecovered * 100) / 100,
    recoveryRate: Math.round(recoveryRate * 10) / 10,
    resolvedPool: Math.round(resolvedPool * 100) / 100,
    acceptedCount, acceptedAmount: Math.round(acceptedAmount * 100) / 100,
    openCount, parkedCount,
    trends: {
      totalAmount: trend(recent.amount, prior.amount),
      inDispute: trend(recent.disputed, prior.disputed),
      recovered: trend(recent.recovered, prior.recovered),
    },
  });
});

// GET /api/dashboard/by-retailer
router.get('/by-retailer', async (req, res) => {
  const companyId = req.query.companyId ? parseInt(req.query.companyId as string) : undefined;

  const where: Prisma.DeductionWhereInput = {
    isDeleted: false,
    retailerId: { not: null },
  };
  if (companyId) where.companyId = companyId;

  const deductions = await prisma.deduction.findMany({
    where,
    select: { retailerId: true, companyId: true, amount: true, status: true, recoveredAmount: true },
  });

  const retailers = await prisma.retailer.findMany();
  const retailerMap = new Map(retailers.map(r => [r.id, r.name]));

  const companies = await prisma.company.findMany();
  const companyMap = new Map(companies.map(c => [c.id, c.name]));

  // Group by retailer, then by company within each retailer
  const byRetailer = new Map<number, { totalAmount: number; byCompany: Map<string, number> }>();

  for (const d of deductions) {
    if (!d.retailerId) continue;
    const entry = byRetailer.get(d.retailerId) ?? { totalAmount: 0, byCompany: new Map() };
    const amt = Number(d.amount);
    entry.totalAmount += amt;
    const cName = d.companyId ? (companyMap.get(d.companyId) ?? 'Unknown') : 'Unknown';
    entry.byCompany.set(cName, (entry.byCompany.get(cName) ?? 0) + amt);
    byRetailer.set(d.retailerId, entry);
  }

  // Only include companies that actually have deductions
  const activeCompanyNames = new Set<string>();
  for (const data of byRetailer.values()) {
    for (const cName of data.byCompany.keys()) {
      activeCompanyNames.add(cName);
    }
  }
  const companyNames = Array.from(activeCompanyNames).sort();

  const result = Array.from(byRetailer.entries())
    .map(([id, data]) => {
      const row: Record<string, unknown> = {
        retailerName: retailerMap.get(id) ?? 'Unknown',
        totalAmount: Math.round(data.totalAmount * 100) / 100,
      };
      for (const cName of companyNames) {
        row[cName] = Math.round((data.byCompany.get(cName) ?? 0) * 100) / 100;
      }
      return row;
    })
    .sort((a, b) => (b.totalAmount as number) - (a.totalAmount as number));

  res.json({ data: result, companies: companyNames });
});

// GET /api/dashboard/aging
router.get('/aging', async (req, res) => {
  const companyId = req.query.companyId ? parseInt(req.query.companyId as string) : undefined;

  const activeStatuses = ['open', 'parked', 'in_dispute', 'dispute_filed'];
  const where: Prisma.DeductionWhereInput = {
    isDeleted: false,
    status: { in: activeStatuses },
    deductedAt: { not: null },
  };
  if (companyId) where.companyId = companyId;

  const deductions = await prisma.deduction.findMany({
    where,
    select: { deductedAt: true, amount: true },
  });

  const now = new Date();
  const buckets = [
    { label: '0-30', count: 0, totalAmount: 0 },
    { label: '31-60', count: 0, totalAmount: 0 },
    { label: '61-90', count: 0, totalAmount: 0 },
    { label: '90+', count: 0, totalAmount: 0 },
  ];

  for (const d of deductions) {
    if (!d.deductedAt) continue;
    const days = Math.floor((now.getTime() - d.deductedAt.getTime()) / (1000 * 60 * 60 * 24));
    const amt = Number(d.amount);
    if (days <= 30) { buckets[0]!.count++; buckets[0]!.totalAmount += amt; }
    else if (days <= 60) { buckets[1]!.count++; buckets[1]!.totalAmount += amt; }
    else if (days <= 90) { buckets[2]!.count++; buckets[2]!.totalAmount += amt; }
    else { buckets[3]!.count++; buckets[3]!.totalAmount += amt; }
  }

  res.json(buckets.map(b => ({ ...b, totalAmount: Math.round(b.totalAmount * 100) / 100 })));
});

// GET /api/dashboard/trends
router.get('/trends', async (req, res) => {
  const companyId = req.query.companyId ? parseInt(req.query.companyId as string) : undefined;

  // Only include deductions within a reasonable date range (exclude mis-parsed future dates)
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() + 1);
  const where: Prisma.DeductionWhereInput = {
    isDeleted: false,
    deductedAt: { not: null, lt: cutoff },
  };
  if (companyId) where.companyId = companyId;

  const deductions = await prisma.deduction.findMany({
    where,
    select: { deductedAt: true, amount: true, status: true, recoveredAmount: true },
  });

  const resolvedStatuses = ['resolved_won', 'resolved_lost', 'resolved_partial', 'closed'];
  const disputeStatuses = ['in_dispute', 'dispute_filed', ...resolvedStatuses];

  const months = new Map<string, { deductions: number; totalAmount: number; disputedAmount: number; recoveredAmount: number }>();

  for (const d of deductions) {
    if (!d.deductedAt) continue;
    const key = `${d.deductedAt.getFullYear()}-${String(d.deductedAt.getMonth() + 1).padStart(2, '0')}`;
    const entry = months.get(key) ?? { deductions: 0, totalAmount: 0, disputedAmount: 0, recoveredAmount: 0 };
    entry.deductions++;
    const amt = Math.abs(Number(d.amount));
    entry.totalAmount += amt;
    if (disputeStatuses.includes(d.status)) {
      entry.disputedAmount += amt;
    }
    if (resolvedStatuses.includes(d.status)) {
      entry.recoveredAmount += Number(d.recoveredAmount ?? 0);
    }
    months.set(key, entry);
  }

  const result = Array.from(months.entries())
    .map(([month, data]) => ({
      month,
      deductions: data.deductions,
      totalAmount: Math.round(data.totalAmount * 100) / 100,
      disputedAmount: Math.round(data.disputedAmount * 100) / 100,
      recoveredAmount: Math.round(data.recoveredAmount * 100) / 100,
      recoveryRate: data.disputedAmount > 0
        ? Math.round((data.recoveredAmount / data.disputedAmount) * 1000) / 10
        : 0,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  res.json(result);
});

export default router;
