import express from 'express';
import {
  register,
  verifyEmailOtp,
  resendOtp,
  login,
  initiateRegistration,
} from "./userController";
import {
  registerRateLimiter,
  otpVerificationRateLimiter,
  otpResendRateLimiter,
  loginRateLimiter,
} from "@middleware/rateLimiter";

const router = express.Router();

router.post("/initial-registration", registerRateLimiter, initiateRegistration);
router.post('/register', registerRateLimiter, register);
router.post('/verify-email-otp', otpVerificationRateLimiter, verifyEmailOtp);
router.post('/resend-otp', otpResendRateLimiter, resendOtp);
router.post('/login', loginRateLimiter, login);


export default router;
