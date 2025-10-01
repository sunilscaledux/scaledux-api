import express from 'express';
import {
  register,
  login,
  logout,
  getCurrentUser,
  testCookies,
  checkUserExistsForLogin,
  resetPassword,
  requestOtp,
  verifyOtp,
  resendOtpUnified,
} from "./userController";
import { generalRateLimiter, otpRateLimiter } from "@middleware/rateLimiter";
import { authenticateToken, preventAuthenticatedAccess } from "@middleware/auth";

const router = express.Router();

router.post("/request-otp", otpRateLimiter, preventAuthenticatedAccess, requestOtp);
router.post("/verify-otp", otpRateLimiter, verifyOtp); 
router.post("/resend-otp", otpRateLimiter, preventAuthenticatedAccess, resendOtpUnified);

router.post("/register", generalRateLimiter, preventAuthenticatedAccess, register);
router.post("/login", generalRateLimiter, preventAuthenticatedAccess, login);
router.post(
  "/check-user-exists",
  generalRateLimiter,
  preventAuthenticatedAccess,
  checkUserExistsForLogin
);
router.post("/reset-password", generalRateLimiter, resetPassword);

router.post("/logout", authenticateToken, logout);
router.get("/auth/me", authenticateToken, getCurrentUser);

// Test cookies  - no authentication required
router.get("/test-cookies", testCookies);

export default router;
