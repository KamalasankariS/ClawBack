import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import authRouter from './routes/auth.js';
import companiesRouter from './routes/companies.js';
import retailersRouter from './routes/retailers.js';
import usersRouter from './routes/users.js';
import disputeReasonsRouter from './routes/dispute-reasons.js';
import deductionsRouter from './routes/deductions.js';
import dashboardRouter from './routes/dashboard.js';
import importAuditRouter from './routes/import-audit.js';
import uploadsRouter from './routes/uploads.js';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/error-handler.js';

const app = express();

// Security headers
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rate limiting (disabled during tests)
if (process.env.NODE_ENV !== 'test') {
  const limiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 100,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
  });
  app.use('/api/', limiter);

  const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many login attempts, please try again later.' },
  });
  app.use('/api/auth', authLimiter);
}

// Public routes (no auth required)
app.use('/api/auth', authRouter);

// Protected routes (JWT required)
app.use('/api/companies', authMiddleware, companiesRouter);
app.use('/api/retailers', authMiddleware, retailersRouter);
app.use('/api/users', authMiddleware, usersRouter);
app.use('/api/dispute-reasons', authMiddleware, disputeReasonsRouter);
app.use('/api/deductions', authMiddleware, deductionsRouter);
app.use('/api/dashboard', authMiddleware, dashboardRouter);
app.use('/api/import-audit', authMiddleware, importAuditRouter);
app.use('/api/uploads', authMiddleware, uploadsRouter);

app.use(errorHandler);

// Serve frontend in production
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

export default app;
