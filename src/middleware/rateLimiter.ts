import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { Request, Response } from 'express';
import redisClient from '@config/radis';



export const registerRateLimiter = rateLimit({
   store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, 
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
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
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
 * General API rate limiter
 * Allows 100 requests per 15 minutes per IP
 */
export const generalRateLimiter = rateLimit({
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

/**
 * Strict rate limiter for sensitive operations
 * Allows 3 attempts per hour per IP
 */
export const strictRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many attempts for this sensitive operation. Please try again after 1 hour.',
      data: {
        retryAfter: 3600, // 1 hour in seconds
        limit: 3,
        windowMs: 60 * 60 * 1000
      }
    });
  }
});
