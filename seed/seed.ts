import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { cleanAmount } from './cleaners/amount.js';
import { cleanDate } from './cleaners/date.js';
import { cleanStatus } from './cleaners/status.js';
import { cleanDeleted } from './cleaners/deleted.js';
import { cleanReason } from './cleaners/reason.js';
import { cleanRetailerName, buildRetailerLookup, resolveRetailerId } from './cleaners/retailer.js';

const prisma = new PrismaClient();

interface RawDeduction {
  id: number | string;
  company_id?: number | null;
  retailer_name?: string;
  retailer?: string;
  reason?: string;
  deduction_reason?: string;
  invoice_number?: string;
  amount?: number | string;
  total_amount?: number | string;
  deducted_at?: string | number;
  status?: string;
  is_deleted?: boolean | number | string;
  notes?: string;
  raw?: string;
  __v?: number;
}

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadJson<T>(filename: string): T {
  const filepath = join(__dirname, 'data', filename);
  return JSON.parse(readFileSync(filepath, 'utf-8'));
}

async function main() {
  console.log('Seeding database...');

  // Clear existing data
  await prisma.$executeRawUnsafe('TRUNCATE TABLE import_audit, activity_log, deductions, users, dispute_reasons, retailers, companies RESTART IDENTITY CASCADE');

  // 1. Seed companies
  const companies = loadJson<Array<{ id: number; name: string; slug: string; erp_system: string | null; default_currency: string; is_active: boolean }>>('companies.json');
  for (const c of companies) {
    await prisma.company.create({
      data: {
        id: c.id,
        name: c.name,
        slug: c.slug,
        erpSystem: c.erp_system,
        defaultCurrency: c.default_currency,
        isActive: c.is_active,
      },
    });
  }
  console.log(`  Seeded ${companies.length} companies`);

  // 2. Seed retailers
  const retailers = loadJson<Array<{ id: number; name: string; type: string; region: string }>>('retailers.json');
  for (const r of retailers) {
    await prisma.retailer.create({
      data: { id: r.id, name: r.name, type: r.type, region: r.region },
    });
  }
  console.log(`  Seeded ${retailers.length} retailers`);

  // 3. Seed dispute reasons
  const reasons = loadJson<Array<{ code: string; label: string; category: string; typically_disputable: boolean }>>('dispute_reasons.json');
  for (const r of reasons) {
    await prisma.disputeReason.create({
      data: {
        code: r.code,
        label: r.label,
        category: r.category,
        typicallyDisputable: r.typically_disputable,
      },
    });
  }
  console.log(`  Seeded ${reasons.length} dispute reasons`);

  // 4. Seed default users
  const users = ['Alice', 'Bob', 'System'];
  for (const name of users) {
    await prisma.user.create({ data: { name, role: name === 'System' ? 'system' : 'analyst' } });
  }
  console.log(`  Seeded ${users.length} users`);

  // 5. Build lookup maps
  const retailerLookup = buildRetailerLookup(retailers);
  const reasonLookup = new Map<string, number>();
  const allReasons = await prisma.disputeReason.findMany();
  for (const r of allReasons) {
    reasonLookup.set(r.code, r.id);
  }
  const validCompanyIds = new Set(companies.map(c => c.id));
  const systemUser = await prisma.user.findFirst({ where: { name: 'System' } });
  const systemUserId = systemUser!.id;

  // 6. Process deductions
  const rawDeductions = loadJson<RawDeduction[]>('deductions.json');
  const importAudits: Array<{ deductionId: number; field: string; rawValue: string | null; cleanedValue: string | null; rule: string }> = [];
  let seededCount = 0;
  const seenIds = new Set<number>();

  for (const raw of rawDeductions) {
    const deductionId = typeof raw.id === 'string' ? parseInt(raw.id, 10) : raw.id;
    if (isNaN(deductionId) || seenIds.has(deductionId)) continue;
    seenIds.add(deductionId);

    // Clean retailer
    const rawRetailerName = raw.retailer_name ?? raw.retailer ?? null;
    const retailerResult = cleanRetailerName(rawRetailerName);
    const retailerId = resolveRetailerId(retailerResult.canonical, retailerLookup);
    if (retailerResult.cleaned) {
      importAudits.push({
        deductionId,
        field: 'retailer_name',
        rawValue: String(rawRetailerName ?? ''),
        cleanedValue: retailerResult.canonical,
        rule: retailerResult.canonical ? 'alias_matched' : 'unresolvable_retailer',
      });
    }

    // Clean amount
    const rawAmount = raw.amount ?? raw.total_amount ?? null;
    const amountResult = cleanAmount(rawAmount);
    if (amountResult.cleaned && amountResult.rule) {
      importAudits.push({
        deductionId,
        field: 'amount',
        rawValue: String(rawAmount ?? ''),
        cleanedValue: String(amountResult.amount),
        rule: amountResult.rule,
      });
    }

    // Clean date
    const dateResult = cleanDate(raw.deducted_at);
    if (dateResult.cleaned && dateResult.rule) {
      importAudits.push({
        deductionId,
        field: 'deducted_at',
        rawValue: String(raw.deducted_at ?? ''),
        cleanedValue: dateResult.date?.toISOString() ?? null,
        rule: dateResult.rule,
      });
    }

    // Clean status
    const statusResult = cleanStatus(raw.status);
    if (statusResult.cleaned && statusResult.rule) {
      importAudits.push({
        deductionId,
        field: 'status',
        rawValue: String(raw.status ?? ''),
        cleanedValue: statusResult.status,
        rule: statusResult.rule,
      });
    }

    // Clean reason
    const rawReason = raw.reason ?? raw.deduction_reason ?? null;
    const reasonResult = cleanReason(rawReason);
    const reasonId = reasonResult.code ? (reasonLookup.get(reasonResult.code) ?? null) : null;
    if (reasonResult.cleaned && reasonResult.rule) {
      importAudits.push({
        deductionId,
        field: 'reason',
        rawValue: String(rawReason ?? ''),
        cleanedValue: reasonResult.code,
        rule: reasonResult.rule,
      });
    }

    // Clean is_deleted
    const isDeleted = cleanDeleted(raw.is_deleted);

    // Clean company_id (handle string/number)
    const rawCompanyId = raw.company_id != null ? Number(raw.company_id) : null;
    let companyId: number | null = null;
    if (rawCompanyId != null && !isNaN(rawCompanyId) && validCompanyIds.has(rawCompanyId)) {
      companyId = rawCompanyId;
    } else if (rawCompanyId != null) {
      importAudits.push({
        deductionId,
        field: 'company_id',
        rawValue: String(rawCompanyId),
        cleanedValue: null,
        rule: 'orphan_company_id',
      });
    }

    // Clean invoice number
    let invoiceNumber = raw.invoice_number ?? null;
    if (invoiceNumber != null) {
      const inv = String(invoiceNumber).trim();
      if (!inv || inv.toLowerCase() === 'null' || inv === '#' || inv.toLowerCase() === 'n/a' || inv === '-') {
        invoiceNumber = null;
      } else {
        invoiceNumber = inv;
      }
    }

    // Insert deduction
    await prisma.deduction.create({
      data: {
        id: deductionId,
        companyId,
        retailerId,
        reasonId,
        invoiceNumber,
        amount: amountResult.amount,
        deductedAt: dateResult.date,
        status: statusResult.status,
        isDeleted: isDeleted,
        notes: raw.notes ?? null,
        rawData: raw as object,
      },
    });

    // Create initial activity log for non-open statuses
    if (statusResult.status !== 'open') {
      await prisma.activityLog.create({
        data: {
          deductionId,
          userId: systemUserId,
          action: 'imported',
          fromStatus: null,
          toStatus: statusResult.status,
          details: { note: 'Initial import from spreadsheet export' },
        },
      });
    }

    seededCount++;
  }
  console.log(`  Seeded ${seededCount} deductions`);

  // 7. Bulk insert import audit records
  if (importAudits.length > 0) {
    await prisma.importAudit.createMany({ data: importAudits });
  }
  console.log(`  Logged ${importAudits.length} import audit entries`);

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
