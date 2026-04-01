import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { Request, Response } from 'express';
import redisClient from "@services/redisService";

/**
 * Create a rate limiter with custom window and limit.
 * @param windowSeconds - Time window in seconds
 * @param max - Max requests per window
 */
export function createRateLimiter(windowSeconds: number, max: number) {
  const windowMs = windowSeconds * 1000;

  return rateLimit({
    store: new RedisStore({
      sendCommand: (...args: string[]) => {
        const [command, ...commandArgs] = args;
        return (redisClient as any)[command.toLowerCase()](...commandArgs);
      },
    }),
    windowMs,
    max,
    keyGenerator: (req: Request) => {
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      const userId = (req as any).user?.id;
      return userId ? `${ip}:uid:${userId}` : ip;
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        message: `Too many requests. Please try again after sometime`,
        data: {
          retryAfter: windowSeconds,
          limit: max,
          windowMs,
        },
      });
    },
  });
}

