import express from 'express';
import {
  register,
  login,
  logout,
  testCookies,
  checkUserExistsForLogin,
  resetPassword,
  requestOtp,
  verifyOtp,
  resendOtpUnified,
  updateUserRole,
  refreshAccessToken,
  listLoginDevices,
  logoutDevice,
  logoutAllOtherDevices,
} from "@module/auth/AuthController";
import { googleCallback } from "@module/auth/AuthGoogleController";
import { linkedinCallback } from "@module/auth/AuthLinkedinController";
import { importLinkedInProfile } from "@module/auth/AuthLinkedinProfileController";
import { createRateLimiter } from "@middleware/rateLimiter";
import { authenticateToken, preventAuthenticatedAccess } from "@middleware/auth";

const router = express.Router();


router.post("/request-otp", createRateLimiter(15 * 60, 15), preventAuthenticatedAccess, requestOtp);
router.post("/verify-otp", createRateLimiter(15 * 60, 15), verifyOtp);
router.post("/resend-otp", createRateLimiter(15 * 60, 15), preventAuthenticatedAccess, resendOtpUnified);

router.post("/register", createRateLimiter(5 * 60, 10), preventAuthenticatedAccess, register);
router.post("/login", createRateLimiter(5 * 60, 10), preventAuthenticatedAccess, login);
router.post(
  "/check-user-exists",
  createRateLimiter(5 * 60, 10),
  preventAuthenticatedAccess,
  checkUserExistsForLogin
);
router.post("/reset-password", createRateLimiter(5 * 60, 5), resetPassword);

router.post("/logout", authenticateToken, logout);
router.post("/refresh-token", createRateLimiter(5 * 60, 20), refreshAccessToken);

router.get("/auth/devices", authenticateToken, listLoginDevices);
router.delete("/auth/devices/:deviceId", authenticateToken, logoutDevice);
router.delete("/auth/devices", authenticateToken, logoutAllOtherDevices);

router.patch("/auth/role", authenticateToken, updateUserRole);
router.post("/auth/google-callback", createRateLimiter(5 * 60, 5), googleCallback);
router.post("/auth/linkedin-callback", createRateLimiter(5 * 60, 5), linkedinCallback);
router.post("/auth/linkedin-import-profile", authenticateToken, importLinkedInProfile);
router.get("/test-cookies", testCookies);

export default router;
