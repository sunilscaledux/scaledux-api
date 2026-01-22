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
  updateUserRole,
} from "@module/auth/AuthController";
import { googleCallback } from "@module/auth/AuthGoogleController";
import { linkedinCallback } from "@module/auth/AuthLinkedinController";
import { importLinkedInProfile } from "@module/auth/AuthLinkedinProfileController";
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
router.patch("/auth/role", authenticateToken, updateUserRole);
router.post("/auth/google-callback", generalRateLimiter, googleCallback);
router.post("/auth/linkedin-callback", generalRateLimiter, linkedinCallback);
router.post("/auth/linkedin-import-profile", authenticateToken, importLinkedInProfile);
router.get("/test-cookies", testCookies);

export default router;
