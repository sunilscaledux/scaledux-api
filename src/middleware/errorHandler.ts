import { Request, Response, NextFunction } from 'express';
import { Log } from '@services/loggerService';

const SHOW_ERROR = process.env.SHOW_ERROR !== 'false';
const FRIENDLY_MESSAGE = "Something went wrong. It's not you, it's us.";

/**
 * Global error handler — must be registered AFTER all routes.
 * Logs the real error, sends a safe message to the client.
 */
export function globalErrorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  const message = err?.message || 'Unknown error';
  const status = err?.statusCode || err?.status || 500;

  // Always log the real error
  Log.error(`[${req.method}] ${req.originalUrl} — ${message}`, {
    stack: err?.stack,
  });

  if (res.headersSent) {
    return _next(err);
  }

  return res.status(status).json({
    success: false,
    message: SHOW_ERROR ? message : FRIENDLY_MESSAGE,
    data: null,
  });
}
