import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.get('/', async (_req, res) => {
  const reasons = await prisma.disputeReason.findMany({ orderBy: { label: 'asc' } });
  res.json(reasons);
});

router.post('/', async (req, res) => {
  const { label, category = 'Other', typicallyDisputable = false } = req.body as {
    label: string; category?: string; typicallyDisputable?: boolean;
  };
  if (!label?.trim()) return res.status(400).json({ error: 'Label is required' });

  const code = label.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').slice(0, 10);
  const existing = await prisma.disputeReason.findFirst({ where: { code } });
  if (existing) return res.status(409).json({ error: 'Reason already exists', reason: existing });

  const reason = await prisma.disputeReason.create({
    data: { code, label: label.trim(), category, typicallyDisputable },
  });
  res.status(201).json(reason);
});

export default router;
