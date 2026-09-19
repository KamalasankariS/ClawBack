import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { signToken, authMiddleware } from '../middleware/auth.js';

const router = Router();

function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must contain at least one special character';
  return null;
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, employeeId, name, password } = req.body as {
    email: string; employeeId: string; name: string; password: string;
  };

  if (!email?.trim() || !employeeId?.trim() || !name?.trim() || !password) {
    return res.status(400).json({ error: 'Email, employee ID, name, and password are required' });
  }

  const cleanEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  const cleanEmployeeId = employeeId.trim().toUpperCase();
  if (cleanEmployeeId.length < 2) {
    return res.status(400).json({ error: 'Employee ID must be at least 2 characters' });
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return res.status(400).json({ error: passwordError });
  }

  const existingEmail = await prisma.user.findUnique({ where: { email: cleanEmail } });
  if (existingEmail) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const existingEmpId = await prisma.user.findUnique({ where: { employeeId: cleanEmployeeId } });
  if (existingEmpId) {
    return res.status(409).json({ error: 'This employee ID is already registered' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      email: cleanEmail,
      employeeId: cleanEmployeeId,
      name: name.trim(),
      passwordHash,
      role: 'analyst',
    },
  });

  const token = signToken({ userId: user.id, email: user.email, name: user.name });
  res.status(201).json({
    token,
    user: { id: user.id, email: user.email, employeeId: user.employeeId, name: user.name, role: user.role },
  });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body as { email: string; password: string };

  if (!email?.trim() || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = signToken({ userId: user.id, email: user.email, name: user.name });
  res.json({
    token,
    user: { id: user.id, email: user.email, employeeId: user.employeeId, name: user.name, role: user.role },
  });
});

// POST /api/auth/demo — instant demo access
router.post('/demo', async (req, res) => {
  const demoEmail = 'demo@clawback.app';
  let user = await prisma.user.findUnique({ where: { email: demoEmail } });

  if (!user) {
    const hash = await bcrypt.hash('Demo1234!', 12);
    user = await prisma.user.create({
      data: {
        email: demoEmail,
        employeeId: 'DEMO-001',
        name: 'Demo Analyst',
        passwordHash: hash,
        role: 'analyst',
      },
    });
  }

  const token = signToken({ userId: user.id, email: user.email, name: user.name });
  res.json({
    token,
    user: { id: user.id, email: user.email, employeeId: user.employeeId, name: user.name, role: user.role },
  });
});

// GET /api/auth/me — get current user from token
router.get('/me', authMiddleware, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { id: true, email: true, employeeId: true, name: true, role: true },
  });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

export default router;
