import express from 'express';
import cors from 'cors';
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
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
