import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.get('/', async (_req, res) => {
  const companies = await prisma.company.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });
  res.json(companies);
});

router.post('/', async (req, res) => {
  const { name } = req.body as { name: string };
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });

  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const existing = await prisma.company.findFirst({ where: { name: name.trim() } });
  if (existing) return res.status(409).json({ error: 'Company already exists', company: existing });

  const maxId = await prisma.company.findFirst({ orderBy: { id: 'desc' }, select: { id: true } });
  const company = await prisma.company.create({
    data: { id: (maxId?.id ?? 0) + 1, name: name.trim(), slug, isActive: true },
  });
  res.status(201).json(company);
});

export default router;
