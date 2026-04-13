// Import module alias setup first
import './moduleAlias';

import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import express from 'express';
import cookieParser from 'cookie-parser';
import userRoutes from "@module/auth/AuthRoute";
import profileRoutes from "@module/profile/ProfileRoute";
import generalRoutes from "@module/general/GeneralRoute";
import deleteFileRoutes from "@module/general/FileRoute";
import educationRoutes from "@module/education/EducationRoute";
import licenseRoutes from './module/license/LicenseRoute';
import workExperienceRoutes from './module/work-experience/WorkExperienceRoute';
import achievementRoutes from './module/achievement/AchievementRoute';
import expertiseRoutes from './module/expertise/ExpertiseRoute';
import verifyRoutes from './module/verify/VerifyRoute';
import portfolioRoutes from './module/portfolio/PortfolioRoute';
import investmentPortfolioRoutes from './module/investment-portfolio/InvestmentPortfolioRoute';
import founderProjectRoutes from './module/founder-project/FounderProjectRoute';
import proposalRoutes from './module/proposal/ProposalRoute';
import chatRoutes from './module/chat/ChatRoute';
import servicePackageRoutes from './module/service-package/ServicePackageRoute';
import billingRoutes from './module/billing/BillingRoute';
import bankInformationRoutes from './module/bank-information/BankInformationRoute';
import taxInformationRoutes from './module/tax-information/TaxInformationRoute';
import reviewRoutes from './module/review/ReviewRoute';
import mentorRoutes from './module/mentor/MentorRoute';
import mentorPackageRoutes from './module/mentor-package/MentorPackageRoute';
import reportRoutes from './module/report/ReportRoute';
import bookingRoutes from './module/booking/BookingRoute';
import { startupPhaseRouter, startupProgressRouter } from './module/startup-phase/StartupPhaseRoute';

import path from "path";
import { corsMiddleware } from "@middleware/cors";
import { privateFileAccess } from "@middleware/auth";
import { viewProtectedFile } from "@module/general/FileController";
import { Log } from '@services/loggerService';
import { resolveRedirectLink } from '@services/redirectLinkService';
import { globalErrorHandler } from '@middleware/errorHandler';

// Bull Board for queue monitoring
import { serverAdapter } from './config/bullBoard';

const app = express();

if (process.env.TRUST_PROXY !== 'false' && process.env.TRUST_PROXY !== '0') {
  const raw = process.env.TRUST_PROXY;
  const hops = raw && /^\d+$/.test(raw) ? parseInt(raw, 10) : 1;
  app.set('trust proxy', Math.max(1, hops));
}

// Setup CORS middleware
app.use(corsMiddleware());

app.use(express.json());
app.use(cookieParser());
/** Private file download — /files/view/:uniqueId?f=originalName */
app.get("/files/view/:uniqueId", privateFileAccess, viewProtectedFile);
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));
app.use("/api/v1", userRoutes);
app.use("/api/v1/profile", profileRoutes);
app.use("/api/v1", generalRoutes);
app.use("/api/v1/files", deleteFileRoutes);
app.use("/api/v1", educationRoutes);
app.use("/api/v1/licenses", licenseRoutes);
app.use("/api/v1/work-experiences", workExperienceRoutes);
app.use("/api/v1/achievements", achievementRoutes);
app.use("/api/v1/expertises", expertiseRoutes);
app.use("/api/v1/verify", verifyRoutes);
app.use("/api/v1/portfolios", portfolioRoutes);
app.use("/api/v1/investment-portfolios", investmentPortfolioRoutes);
app.use("/api/v1/founder-projects", founderProjectRoutes);
app.use("/api/v1/proposals", proposalRoutes);
app.use("/api/v1", chatRoutes);
app.use("/api/v1/service-packages", servicePackageRoutes);
app.use("/api/v1/billing", billingRoutes);
app.use("/api/v1/billing", bankInformationRoutes);
app.use("/api/v1/billing", taxInformationRoutes);
app.use("/api/v1/reviews", reviewRoutes);
app.use("/api/v1/mentors", mentorRoutes);
app.use("/api/v1/mentor-packages", mentorPackageRoutes);
app.use("/api/v1/reports", reportRoutes);
app.use("/api/v1/bookings", bookingRoutes);
app.use("/api/v1/startup-phases", startupPhaseRouter);
app.use("/api/v1/profile/company/startup-progress", startupProgressRouter);

// Public redirect endpoint — /r/:code/redirect → redirects to target URL
app.get("/r/:code/redirect", async (req, res) => {
  const targetUrl = await resolveRedirectLink(req.params.code);
  if (!targetUrl) return res.status(404).send('Link not found');
  return res.redirect(302, targetUrl);
});
// Also support old /r/:code format
app.get("/r/:code", async (req, res) => {
  const targetUrl = await resolveRedirectLink(req.params.code);
  if (!targetUrl) return res.status(404).send('Link not found');
  return res.redirect(302, targetUrl);
});

// Bull Board UI for queue monitoring (only in development)
if (process.env.NODE_ENV !== 'production') {
  app.use('/admin/queues', serverAdapter.getRouter());
  Log.info('Bull Board available at: http://localhost:4000/admin/queues');
}

// Global error handler — catches all unhandled errors from controllers
app.use(globalErrorHandler);

const PORT = process.env.PORT || 4000;

const httpServer = http.createServer(app);

// Allow large file uploads (streaming to Bunny CDN) without socket hang up
httpServer.timeout = 5 * 60 * 1000; // 5 minutes
httpServer.keepAliveTimeout = 120 * 1000; // 2 minutes
httpServer.headersTimeout = 125 * 1000; // slightly above keepAliveTimeout

async function start() {
  httpServer.listen(PORT, () => {
    Log.info(`API Base URL: http://localhost:${PORT}/api/v1`);
  });
}

start();

export default app;
