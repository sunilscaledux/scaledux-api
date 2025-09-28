import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { Request, Response } from 'express';
import redisClient from '@config/redis';



export const registerRateLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => {
      const [command, ...commandArgs] = args;
      return (redisClient as any)[command.toLowerCase()](...commandArgs);
    },
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, 
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many registration attempts. Please try again after 15 minutes.',
      data: {
        retryAfter: 900, // 15 minutes in seconds
        limit: 5,
        windowMs: 15 * 60 * 1000
      }
    });
  }
});

/**
 * Rate limiter for login endpoint
 * Allows 10 login attempts per 15 minutes per IP
 */
export const loginRateLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => {
      const [command, ...commandArgs] = args;
      return (redisClient as any)[command.toLowerCase()](...commandArgs);
    },
  }),
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // Limit each IP to 10 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many login attempts. Please try again after 15 minutes.',
      data: {
        retryAfter: 900, // 15 minutes in seconds
        limit: 10,
        windowMs: 15 * 60 * 1000
      }
    });
  }
});

/**
 * Rate limiter for OTP verification endpoint
 * Allows 10 OTP verification attempts per 15 minutes per IP
 */
export const otpVerificationRateLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => {
      const [command, ...commandArgs] = args;
      return (redisClient as any)[command.toLowerCase()](...commandArgs);
    },
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, 
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many OTP verification attempts. Please try again after 15 minutes.',
      data: {
        retryAfter: 900, // 15 minutes in seconds
        limit: 10,
        windowMs: 15 * 60 * 1000
      }
    });
  }
});

/**
 * Rate limiter for OTP resend endpoint
 * Allows 5 OTP resend attempts per 15 minutes per IP
 */
export const otpResendRateLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => {
      const [command, ...commandArgs] = args;
      return (redisClient as any)[command.toLowerCase()](...commandArgs);
    },
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, 
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many OTP resend attempts. Please try again after 15 minutes.',
      data: {
        retryAfter: 900, // 15 minutes in seconds
        limit: 5,
        windowMs: 15 * 60 * 1000
      }
    });
  }
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
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again after 15 minutes.',
      data: {
        retryAfter: 900, // 15 minutes in seconds
        limit: 100,
        windowMs: 15 * 60 * 1000
      }
    });
  }
});
