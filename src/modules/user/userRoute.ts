import express from 'express';
import {
  register,
  login,
  checkUserExistsForLogin,
  resetPassword,
  // Unified OTP functions
  requestOtp,
  verifyOtp,
  resendOtpUnified,
  // Keep only essential legacy functions
  verifyEmailOtp,
  initiateRegistration,
} from "./userController";
import { generalRateLimiter, otpRateLimiter } from "@middleware/rateLimiter";

const router = express.Router();

router.post("/request-otp", otpRateLimiter, requestOtp);
router.post("/verify-otp", otpRateLimiter, verifyOtp);
router.post("/resend-otp", otpRateLimiter, resendOtpUnified);

router.post("/register", generalRateLimiter, register);
router.post("/login", generalRateLimiter, login);
router.post("/check-user-exists", generalRateLimiter, checkUserExistsForLogin);
router.post("/reset-password", generalRateLimiter, resetPassword);



export default router;
