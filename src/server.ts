// Import module alias setup first
import './moduleAlias';

import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import userRoutes from "@module/auth/AuthRoute";
import profileRoutes from "@module/profile/ProfileRoute";
import generalRoutes from "@module/location/GeneralRoute";
import educationRoutes from "@module/education/EducationRoute";
import licenseRoutes from "@module/license/LicenseRoute";

import cors from "cors";
import path from "path";

dotenv.config();
const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_APP_URL || "http://127.0.0.1:3000", // Fallback for development
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
    exposedHeaders: ["Set-Cookie"],
  })
);

app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.use("/api/v1", userRoutes);
app.use("/api/v1", profileRoutes);
app.use("/api/v1", generalRoutes);
app.use("/api/v1", educationRoutes);
app.use("/api/v1/licenses", licenseRoutes);

app.listen(process.env.PORT, () => {
  console.log("server is working");
});

export default app;
