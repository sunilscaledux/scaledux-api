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
import {
  get2FAStatus,
  enable2FA,
  confirm2FA,
  disable2FA,
  regenerateBackupCodes,
  verify2FA,
  verify2FABackup,
  send2FAOtp,
  resend2FALoginOtp,
} from "@module/auth/TwoFAController";
import { googleCallback } from "@module/auth/AuthGoogleController";
import { linkedinCallback } from "@module/auth/AuthLinkedinController";
import { importLinkedInProfile } from "@module/auth/AuthLinkedinProfileController";
import { createRateLimiter } from "@middleware/rateLimiter";
import { authenticateToken, preventAuthenticatedAccess } from "@middleware/auth";

const router = express.Router();


router.post("/request-otp", createRateLimiter(5 * 60, 5), preventAuthenticatedAccess, requestOtp);
router.post("/verify-otp", createRateLimiter(5 * 60, 10), verifyOtp);
router.post("/resend-otp", createRateLimiter(5 * 60, 5), preventAuthenticatedAccess, resendOtpUnified);

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

// 2FA routes (public, token in body)
router.post("/auth/2fa/verify", createRateLimiter(5 * 60, 10), verify2FA);
router.post("/auth/2fa/verify-backup", createRateLimiter(5 * 60, 5), verify2FABackup);
router.post("/auth/2fa/resend-otp", createRateLimiter(5 * 60, 5), resend2FALoginOtp);

// 2FA settings (authenticated)
router.get("/auth/2fa/status", authenticateToken, get2FAStatus);
router.post("/auth/2fa/enable", authenticateToken, enable2FA);
router.post("/auth/2fa/enable/confirm", authenticateToken, confirm2FA);
router.post("/auth/2fa/disable", authenticateToken, disable2FA);
router.post("/auth/2fa/send-otp", authenticateToken, send2FAOtp);
router.post("/auth/2fa/regenerate-backup-codes", authenticateToken, regenerateBackupCodes);
router.post("/auth/google-callback", createRateLimiter(5 * 60, 5), googleCallback);
router.post("/auth/linkedin-callback", createRateLimiter(5 * 60, 5), linkedinCallback);
router.post("/auth/linkedin-import-profile", authenticateToken, importLinkedInProfile);
router.get("/test-cookies", testCookies);

export default router;
