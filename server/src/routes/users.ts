import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.get('/', async (_req, res) => {
  const users = await prisma.user.findMany({
    where: { role: { not: 'system' } },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, email: true, role: true },
  });
  res.json(users);
});

export default router;
