import express from 'express';
import {
  register,
  verifyEmailOtp,
  resendOtp,
  login,
  initiateRegistration,
  checkUserExistsForLogin,
  requestLoginOtp,
  verifyLoginOtp,
  requestForgotPasswordOtp,
  verifyForgotPasswordOtp,
} from "./userController";
import { generalRateLimiter, otpRateLimiter } from "@middleware/rateLimiter";

const router = express.Router();

router.post("/initial-registration", generalRateLimiter, initiateRegistration);
router.post("/register", generalRateLimiter, register);
router.post("/verify-email-otp", otpRateLimiter, verifyEmailOtp);
router.post("/resend-otp", otpRateLimiter, resendOtp);
router.post("/check-user-exists", generalRateLimiter, checkUserExistsForLogin);
router.post("/login", generalRateLimiter, login);
router.post("/request-login-otp", otpRateLimiter, requestLoginOtp);
router.post("/verify-login-otp", otpRateLimiter, verifyLoginOtp);
router.post(
  "/request-forgot-password-otp",
  generalRateLimiter,
  requestForgotPasswordOtp
);
router.post(
  "/verify-forgot-password-otp",
  otpRateLimiter,
  verifyForgotPasswordOtp
);


export default router;
