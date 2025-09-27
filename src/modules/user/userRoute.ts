import express from 'express';
import { register } from './userController';
import { registerRateLimiter } from '@middleware/rateLimiter';

const router = express.Router();

router.post('/register', registerRateLimiter, register);
// router.post('/login', loginRateLimiter, login);

export default router;
