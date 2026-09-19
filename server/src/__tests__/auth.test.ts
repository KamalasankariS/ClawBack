import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { prisma } from '../lib/prisma.js';

describe('Auth API', () => {
  const testEmail = `test_${Date.now()}@clawback.test`;
  const testEmpId = `TST-${Date.now()}`;
  let token: string;

  afterAll(async () => {
    // Cleanup test user
    await prisma.user.deleteMany({ where: { email: testEmail } }).catch(() => {});
    await prisma.$disconnect();
  });

  // ─── Registration ───

  it('rejects registration with missing fields', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: testEmail });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('rejects weak password (no uppercase)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: testEmail, employeeId: testEmpId, name: 'Test', password: 'weak1234_' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/uppercase/i);
  });

  it('rejects weak password (no special char)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: testEmail, employeeId: testEmpId, name: 'Test', password: 'Weak1234' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/special/i);
  });

  it('rejects weak password (too short)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: testEmail, employeeId: testEmpId, name: 'Test', password: 'Ab1_' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/8 characters/i);
  });

  it('rejects invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', employeeId: testEmpId, name: 'Test', password: 'Strong_1234' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email/i);
  });

  it('registers a new user with valid data', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: testEmail, employeeId: testEmpId, name: 'Test User', password: 'Strong_1234' });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(testEmail.toLowerCase());
    expect(res.body.user.role).toBe('analyst');
    token = res.body.token;
  });

  it('rejects duplicate email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: testEmail, employeeId: `DIFF-${Date.now()}`, name: 'Test', password: 'Strong_1234' });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/email already exists/i);
  });

  it('rejects duplicate employee ID', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: `diff_${Date.now()}@clawback.test`, employeeId: testEmpId, name: 'Test', password: 'Strong_1234' });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/employee ID/i);
  });

  // ─── Login ───

  it('rejects login with wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: 'WrongPass_1' });
    expect(res.status).toBe(401);
  });

  it('rejects login with nonexistent email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nonexistent@clawback.test', password: 'Strong_1234' });
    expect(res.status).toBe(401);
  });

  it('logs in with correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: 'Strong_1234' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(testEmail.toLowerCase());
  });

  // ─── Protected routes ───

  it('rejects requests without token', async () => {
    const res = await request(app).get('/api/companies');
    expect(res.status).toBe(401);
  });

  it('rejects requests with invalid token', async () => {
    const res = await request(app)
      .get('/api/companies')
      .set('Authorization', 'Bearer invalid.token.here');
    expect(res.status).toBe(401);
  });

  it('allows requests with valid token', async () => {
    const res = await request(app)
      .get('/api/companies')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/auth/me returns current user', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(testEmail.toLowerCase());
  });
});
