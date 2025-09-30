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

// OTP routes - prevent authenticated users from accessing
router.post("/request-otp", otpRateLimiter, preventAuthenticatedAccess, requestOtp);
router.post("/verify-otp", otpRateLimiter, verifyOtp); // Allow for password reset
router.post("/resend-otp", otpRateLimiter, preventAuthenticatedAccess, resendOtpUnified);

// Auth routes - prevent authenticated users from accessing
router.post("/register", generalRateLimiter, preventAuthenticatedAccess, register);
router.post("/login", generalRateLimiter, preventAuthenticatedAccess, login);
router.post("/check-user-exists", generalRateLimiter, preventAuthenticatedAccess, checkUserExistsForLogin);

// Password reset - allow unauthenticated access
router.post("/reset-password", generalRateLimiter, resetPassword);

// Logout - require authentication
router.post("/logout", generalRateLimiter, authenticateToken, logout);

// Get current user - require authentication
router.get("/auth/me", generalRateLimiter, authenticateToken, getCurrentUser);

// Test cookies endpoint - no authentication required
router.get("/test-cookies", testCookies);



export default router;
