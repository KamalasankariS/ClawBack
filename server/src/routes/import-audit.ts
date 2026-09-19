import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.get('/', async (req, res) => {
  const { deductionId, field, page = '1', limit = '50' } = req.query as Record<string, string>;

  const where: { deductionId?: number; field?: string } = {};
  if (deductionId) where.deductionId = parseInt(deductionId);
  if (field) where.field = field;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const [audits, total] = await Promise.all([
    prisma.importAudit.findMany({
      where, skip, take,
      orderBy: { id: 'asc' },
    }),
    prisma.importAudit.count({ where }),
  ]);

  res.json({ data: audits, total, page: parseInt(page), limit: parseInt(limit) });
});

export default router;
