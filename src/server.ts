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
import reviewRoutes from './module/review/ReviewRoute';

import path from "path";
import { corsMiddleware } from "@middleware/cors";
import { privateFileAccess } from "@middleware/auth";
import { viewProtectedFile } from "@module/general/FileController";
import { Log } from '@services/loggerService';

// Bull Board for queue monitoring
import { serverAdapter } from './config/bullBoard';

const app = express();

// Setup CORS middleware
app.use(corsMiddleware());

app.use(express.json());
app.use(cookieParser());
/** Private file download — short URL (no /api/v1). Same handler as /api/v1/files/view/:uniqueId */
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
app.use("/api/v1/reviews", reviewRoutes);

// Bull Board UI for queue monitoring (only in development)
if (process.env.NODE_ENV !== 'production') {
  app.use('/admin/queues', serverAdapter.getRouter());
  Log.info('Bull Board available at: http://localhost:4000/admin/queues');
}

const PORT = process.env.PORT || 4000;

const httpServer = http.createServer(app);

async function start() {
  httpServer.listen(PORT, () => {
    Log.info(`API Base URL: http://localhost:${PORT}/api/v1`);
  });
}

start();

export default app;
