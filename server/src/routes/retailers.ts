import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.get('/', async (_req, res) => {
  const retailers = await prisma.retailer.findMany({ orderBy: { name: 'asc' } });
  res.json(retailers);
});

router.post('/', async (req, res) => {
  const { name, type = 'Retailer', region = 'US' } = req.body as { name: string; type?: string; region?: string };
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });

  const existing = await prisma.retailer.findFirst({ where: { name: name.trim() } });
  if (existing) return res.status(409).json({ error: 'Retailer already exists', retailer: existing });

  const maxId = await prisma.retailer.findFirst({ orderBy: { id: 'desc' }, select: { id: true } });
  const retailer = await prisma.retailer.create({
    data: { id: (maxId?.id ?? 0) + 1, name: name.trim(), type, region },
  });
  res.status(201).json(retailer);
});

export default router;
