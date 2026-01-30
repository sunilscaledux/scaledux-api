// Import module alias setup first
import './moduleAlias';

import express from 'express';
import dotenv from 'dotenv';
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
import founderProjectRoutes from './module/founder-project/FounderProjectRoute';
import proposalRoutes from './module/proposal/ProposalRoute';
import servicePackageRoutes from './module/service-package/ServicePackageRoute';
import serviceCategoryRoutes from './module/service-category/ServiceCategoryRoute';
import billingRoutes from './module/billing/BillingRoute';

import path from "path";
import { corsMiddleware } from "@middleware/cors";

// Start main worker for background job processing (Laravel style)
import './workers/Worker';

// Bull Board for queue monitoring
import { serverAdapter } from './config/bullBoard';

dotenv.config();
const app = express();

// Setup CORS middleware
app.use(corsMiddleware());

app.use(express.json());
app.use(cookieParser());
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
app.use("/api/v1/founder-projects", founderProjectRoutes);
app.use("/api/v1/proposals", proposalRoutes);
app.use("/api/v1/service-packages", servicePackageRoutes);
app.use("/api/v1/service-categories", serviceCategoryRoutes);
app.use("/api/v1/billing", billingRoutes);

// Bull Board UI for queue monitoring (only in development)
if (process.env.NODE_ENV !== 'production') {
  app.use('/admin/queues', serverAdapter.getRouter());
  console.log('📊 Bull Board available at: http://localhost:4001/admin/queues');
}

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`API Base URL: http://localhost:${PORT}/api/v1`);
  console.log(`🏢 Company API: http://localhost:${PORT}/api/v1/company`);
});

export default app;
