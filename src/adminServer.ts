// Admin API entry point. Same codebase + DB as the main API, but a separate
// process on its own port (ADMIN_PORT, default 4002) under /api/admin/v1.
// Run: `npm run dev:admin` (or the prod-admin Docker target).
import './moduleAlias';

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cookieParser from 'cookie-parser';

import { corsMiddleware } from '@admin/middleware/cors';
import { globalErrorHandler } from '@middleware/errorHandler';
import { appConfig } from '@admin/config';
import { Log } from '@services/loggerService';

import adminAuthRoutes from '@admin/modules/auth/AdminAuthRoute';
import dashboardRoutes from '@admin/modules/dashboard/DashboardRoute';
import userRoutes from '@admin/modules/user/UserRoute';
import verificationRoutes from '@admin/modules/verification/VerificationRoute';
import projectRoutes from '@admin/modules/project/ProjectRoute';
import proposalRoutes from '@admin/modules/proposal/ProposalRoute';
import bookingRoutes from '@admin/modules/booking/BookingRoute';
import billingRoutes from '@admin/modules/billing/BillingRoute';
import reportRoutes from '@admin/modules/report/ReportRoute';
import reviewRoutes from '@admin/modules/review/ReviewRoute';
import contentRoutes from '@admin/modules/content/ContentRoute';
import constantRoutes from '@admin/modules/constant/ConstantRoute';
import notificationRoutes from '@admin/modules/notification/NotificationRoute';
import adminMgmtRoutes from '@admin/modules/admin/AdminRoute';
import auditRoutes from '@admin/modules/audit/AuditRoute';

const app = express();

app.set('trust proxy', 1);
app.use(corsMiddleware());
app.use(express.json());
app.use(cookieParser());

app.get('/health', (_req, res) => {
  res.json({ success: true, message: 'admin-api ok', data: { uptime: process.uptime() } });
});

const BASE = '/api/admin/v1';
app.use(`${BASE}/auth`, adminAuthRoutes);
app.use(`${BASE}/dashboard`, dashboardRoutes);
app.use(`${BASE}/users`, userRoutes);
app.use(`${BASE}/verifications`, verificationRoutes);
app.use(`${BASE}/projects`, projectRoutes);
app.use(`${BASE}/proposals`, proposalRoutes);
app.use(`${BASE}/bookings`, bookingRoutes);
app.use(`${BASE}/billing`, billingRoutes);
app.use(`${BASE}/reports`, reportRoutes);
app.use(`${BASE}/reviews`, reviewRoutes);
app.use(`${BASE}/content`, contentRoutes);
app.use(`${BASE}/constants`, constantRoutes);
app.use(`${BASE}/notifications`, notificationRoutes);
app.use(`${BASE}/admins`, adminMgmtRoutes);
app.use(`${BASE}/audit-logs`, auditRoutes);

app.use(globalErrorHandler);

const PORT = appConfig.port;
app.listen(PORT, () => {
  Log.info(`Admin API running at http://localhost:${PORT}${BASE}`);
});

export default app;
