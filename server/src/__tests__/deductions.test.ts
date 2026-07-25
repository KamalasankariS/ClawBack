import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { prisma } from '../lib/prisma.js';

describe('Deductions API', () => {
  let token: string;
  let testDeductionId: number;
  let companyId: number;
  let retailerId: number;
  const testEmail = `ded_test_${Date.now()}@confido.com`;
  const cleanupIds: number[] = [];

  beforeAll(async () => {
    // Register a test user
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: testEmail, employeeId: `DED-${Date.now()}`, name: 'Ded Tester', password: 'Strong_1234' });
    token = res.body.token;

    // Get real company and retailer IDs from DB
    const company = await prisma.company.findFirst();
    const retailer = await prisma.retailer.findFirst();
    companyId = company!.id;
    retailerId = retailer!.id;
  });

  afterAll(async () => {
    // Cleanup test deductions
    for (const id of cleanupIds) {
      await prisma.activityLog.deleteMany({ where: { deductionId: id } }).catch(() => {});
      await prisma.deduction.deleteMany({ where: { id } }).catch(() => {});
    }
    await prisma.user.deleteMany({ where: { email: testEmail } }).catch(() => {});
    await prisma.$disconnect();
  });

  // ─── List ───

  it('GET /api/deductions returns paginated list', async () => {
    const res = await request(app)
      .get('/api/deductions?page=1&limit=10')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('page');
    expect(res.body).toHaveProperty('limit');
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('filters by status', async () => {
    const res = await request(app)
      .get('/api/deductions?status=open&limit=5')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    for (const d of res.body.data) {
      expect(d.status).toBe('open');
    }
  });

  it('filters by multiple statuses', async () => {
    const res = await request(app)
      .get('/api/deductions?status=open,closed&limit=5')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    for (const d of res.body.data) {
      expect(['open', 'closed']).toContain(d.status);
    }
  });

  it('sorts by amount ascending', async () => {
    const res = await request(app)
      .get('/api/deductions?sort=amount:asc&limit=5')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const amounts = res.body.data.map((d: any) => Number(d.amount));
    for (let i = 1; i < amounts.length; i++) {
      expect(amounts[i]).toBeGreaterThanOrEqual(amounts[i - 1]);
    }
  });

  it('searches by invoice number', async () => {
    const res = await request(app)
      .get('/api/deductions?search=INV&limit=5')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  // ─── Export ───

  it('GET /api/deductions/export returns CSV', async () => {
    const res = await request(app)
      .get('/api/deductions/export?sort=deductedAt:desc')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.headers['content-disposition']).toMatch(/attachment.*\.csv/);
    expect(res.text).toContain('ID,Company,Retailer');
    const lines = res.text.trim().split('\n');
    expect(lines.length).toBeGreaterThan(1);
  });

  it('export respects status filter', async () => {
    const res = await request(app)
      .get('/api/deductions/export?status=open&sort=id:asc')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const lines = res.text.trim().split('\n');
    for (let i = 1; i < Math.min(lines.length, 10); i++) {
      expect(lines[i]).toContain('open');
    }
  });

  // ─── Create ───

  it('rejects create with missing required fields', async () => {
    const res = await request(app)
      .post('/api/deductions')
      .set('Authorization', `Bearer ${token}`)
      .send({ companyId });
    expect(res.status).toBe(400);
  });

  it('rejects create with negative amount', async () => {
    const res = await request(app)
      .post('/api/deductions')
      .set('Authorization', `Bearer ${token}`)
      .send({ companyId, retailerId, amount: -50, deductedAt: '2026-01-01' });
    expect(res.status).toBe(400);
  });

  it('creates a deduction with valid data', async () => {
    const res = await request(app)
      .post('/api/deductions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        companyId, retailerId,
        amount: 100.50,
        deductedAt: '2026-06-15',
        invoiceNumber: 'TEST-INV-001',
        notes: 'Test deduction for CI',
      });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('open');
    expect(Number(res.body.amount)).toBe(100.50);
    expect(res.body.invoiceNumber).toBe('TEST-INV-001');
    testDeductionId = res.body.id;
    cleanupIds.push(testDeductionId);
  });

  it('normalizes invoice number on create', async () => {
    const res = await request(app)
      .post('/api/deductions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        companyId, retailerId,
        amount: 25,
        deductedAt: '2026-06-15',
        invoiceNumber: ' inv@#123 ',
      });
    expect(res.status).toBe(201);
    expect(res.body.invoiceNumber).toBe('INV123');
    cleanupIds.push(res.body.id);
  });

  // ─── Workflow transitions ───

  it('triages to in_dispute with mandatory notes', async () => {
    const res = await request(app)
      .patch(`/api/deductions/${testDeductionId}/triage`)
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'dispute', notes: 'Disputing because amount is incorrect' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('in_dispute');
  });

  it('rejects triage without notes', async () => {
    // Create another open deduction for this test
    const createRes = await request(app)
      .post('/api/deductions')
      .set('Authorization', `Bearer ${token}`)
      .send({ companyId, retailerId, amount: 10, deductedAt: '2026-06-15' });
    const tempId = createRes.body.id;
    cleanupIds.push(tempId);

    const res = await request(app)
      .patch(`/api/deductions/${tempId}/triage`)
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'accept' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/notes/i);
  });

  it('advances to dispute_filed', async () => {
    const res = await request(app)
      .patch(`/api/deductions/${testDeductionId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'dispute_filed', notes: 'Filed dispute with retailer portal' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('dispute_filed');
  });

  it('blocks invalid transition (dispute_filed → open)', async () => {
    const res = await request(app)
      .patch(`/api/deductions/${testDeductionId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'open', notes: 'Try to go back' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/cannot transition/i);
  });

  it('resolves as won', async () => {
    const res = await request(app)
      .patch(`/api/deductions/${testDeductionId}/resolve`)
      .set('Authorization', `Bearer ${token}`)
      .send({ resolutionType: 'won', notes: 'Full credit received' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('resolved_won');
    expect(Number(res.body.recoveredAmount)).toBe(100.50);
  });

  it('closes the resolved deduction', async () => {
    const res = await request(app)
      .patch(`/api/deductions/${testDeductionId}/close`)
      .set('Authorization', `Bearer ${token}`)
      .send({ notes: 'Closing after successful recovery' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('closed');
  });

  it('blocks closing an already closed deduction', async () => {
    const res = await request(app)
      .patch(`/api/deductions/${testDeductionId}/close`)
      .set('Authorization', `Bearer ${token}`)
      .send({ notes: 'Try closing again' });
    expect(res.status).toBe(400);
  });

  // ─── Activity timeline ───

  it('GET /api/deductions/:id includes activity log', async () => {
    const res = await request(app)
      .get(`/api/deductions/${testDeductionId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.activities)).toBe(true);
    expect(res.body.activities.length).toBeGreaterThanOrEqual(4);
    for (const a of res.body.activities) {
      expect(a.user).toBeDefined();
      expect(a.user.name).toBeDefined();
    }
  });

  // ─── Duplicate check ───

  it('detects potential duplicates', async () => {
    const res = await request(app)
      .post('/api/deductions/check-duplicate')
      .set('Authorization', `Bearer ${token}`)
      .send({ retailerId, amount: 100.50 });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.duplicates)).toBe(true);
  });

  // ─── 404 handling ───

  it('returns 404 for nonexistent deduction', async () => {
    const res = await request(app)
      .get('/api/deductions/999999')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  // ─── Bulk actions ───

  it('rejects bulk action without notes', async () => {
    const res = await request(app)
      .post('/api/deductions/bulk')
      .set('Authorization', `Bearer ${token}`)
      .send({ ids: [1, 2], action: 'accept' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/notes/i);
  });

  it('rejects bulk action with empty ids', async () => {
    const res = await request(app)
      .post('/api/deductions/bulk')
      .set('Authorization', `Bearer ${token}`)
      .send({ ids: [], action: 'accept', notes: 'test' });
    expect(res.status).toBe(400);
  });
});
