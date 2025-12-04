// Import module alias setup first
import './moduleAlias';

import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import userRoutes from "@module/auth/AuthRoute";
import profileRoutes from "@module/profile/ProfileRoute";
import generalRoutes from "@module/location/GeneralRoute";
import educationRoutes from "@module/education/EducationRoute";
import licenseRoutes from './module/license/LicenseRoute';
import workExperienceRoutes from './module/work-experience/WorkExperienceRoute';
import achievementRoutes from './module/achievement/AchievementRoute';
import expertiseRoutes from './module/expertise/ExpertiseRoute';
import verifyRoutes from './module/verify/VerifyRoute';
import portfolioRoutes from './module/portfolio/PortfolioRoute';

import cors from "cors";
import path from "path";

dotenv.config();
const app = express();

// Enhanced CORS configuration
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      // Allow all origins
      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"],
    allowedHeaders: [
      "Origin",
      "X-Requested-With", 
      "Content-Type", 
      "Accept", 
      "Authorization", 
      "Cookie",
      "Cache-Control",
      "Access-Control-Request-Method",
      "Access-Control-Request-Headers"
    ],
    exposedHeaders: ["Set-Cookie", "Authorization"],
    optionsSuccessStatus: 200, // Some legacy browsers choke on 204
    preflightContinue: false
  })
);

// Additional manual CORS headers for extra compatibility
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Vary', 'Origin');
  next();
});

app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.use("/api/v1", userRoutes);
app.use("/api/v1", profileRoutes);
app.use("/api/v1", generalRoutes);
app.use("/api/v1", educationRoutes);
app.use("/api/v1/licenses", licenseRoutes);
app.use("/api/v1/work-experiences", workExperienceRoutes);
app.use("/api/v1/achievements", achievementRoutes);
app.use("/api/v1/expertises", expertiseRoutes);
app.use("/api/v1/verify", verifyRoutes);
app.use("/api/v1/portfolios", portfolioRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API Base URL: http://localhost:${PORT}/api/v1`);
});

export default app;
