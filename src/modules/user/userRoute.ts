import express from 'express';
import { register, verifyEmailOtp, resendOtp } from './userController';
import { registerRateLimiter, strictRateLimiter } from '@middleware/rateLimiter';

const router = express.Router();

router.post('/register', registerRateLimiter, register);
router.post('/verify-email-otp', strictRateLimiter, verifyEmailOtp);
router.post('/resend-otp', registerRateLimiter, resendOtp);
// router.post('/login', loginRateLimiter, login);

export default router;
