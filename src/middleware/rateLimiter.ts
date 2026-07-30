import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { Request, Response } from 'express';
import redisClient from "@services/redisService";

/**
 * Create a rate limiter with custom window and limit.
 * @param windowSeconds - Time window in seconds
 * @param max - Max requests per window
 * @param keyScope - Shared bucket name; defaults to the request URL, so pass this
 *   when several routes have to draw from the same allowance.
 */
export function createRateLimiter(windowSeconds: number, max: number, keyScope?: string) {
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
      const scope = keyScope || req.originalUrl || req.path;
      return userId ? `rl:${scope}:${ip}:uid:${userId}` : `rl:${scope}:${ip}`;
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      const minutes = Math.ceil(windowSeconds / 60);
      const hours = Math.floor(minutes / 60);
      const remainingMins = minutes % 60;
      let retryText: string;
      if (hours >= 1) {
        retryText = remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours} hour${hours > 1 ? 's' : ''}`;
      } else {
        retryText = minutes === 1 ? '1 minute' : `${minutes} minutes`;
      }
      res.status(429).json({
        success: false,
        message: `Too many requests. Please try again after ${retryText}.`,
        data: {
          retryAfter: windowSeconds,
          limit: max,
          windowMs,
        },
      });
    },
  });
}

