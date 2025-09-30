import express from 'express';
import {
  register,
  login,
  logout,
  checkUserExistsForLogin,
  resetPassword,
  requestOtp,
  verifyOtp,
  resendOtpUnified,
} from "./userController";
import { generalRateLimiter, otpRateLimiter } from "@middleware/rateLimiter";

const router = express.Router();

router.post("/request-otp", otpRateLimiter, requestOtp);
router.post("/verify-otp", otpRateLimiter, verifyOtp);
router.post("/resend-otp", otpRateLimiter, resendOtpUnified);

router.post("/register", generalRateLimiter, register);
router.post("/login", generalRateLimiter, login);
router.post("/logout", generalRateLimiter, logout);
router.post("/check-user-exists", generalRateLimiter, checkUserExistsForLogin);
router.post("/reset-password", generalRateLimiter, resetPassword);



export default router;
