import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { Request, Response } from 'express';
import redisClient from "@services/redisService";



export const otpRateLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => {
      const [command, ...commandArgs] = args;
      return (redisClient as any)[command.toLowerCase()](...commandArgs);
    },
  }),
  windowMs: 15 * 60 * 1000, // 10 minutes
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message:
        "Too many OTP resend attempts. Please try again after 15 minutes.",
      data: {
        retryAfter: 900, // 15 minutes in seconds
        limit: 5,
        windowMs: 15 * 60 * 1000,
      },
    });
  },
});

/**
 * General API rate limiter
 * Allows 100 requests per 15 minutes per IP
 */
export const generalRateLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => {
      const [command, ...commandArgs] = args;
      return (redisClient as any)[command.toLowerCase()](...commandArgs);
    },
  }),
  windowMs: 5 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: "Too many requests. Please try again after 15 minutes.",
      data: {
        retryAfter: 900, // 15 minutes in seconds
        limit: 100,
        windowMs: 15 * 60 * 1000,
      },
    });
  },
});
