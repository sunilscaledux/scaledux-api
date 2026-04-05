import { Request, Response, NextFunction } from 'express';
import jwt from "jsonwebtoken";
import { ApiResponse } from '@utils/ApiResponse';
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}


export function privateFileAccess(req: Request, res: Response, next: NextFunction) {
  try {
    // Try cookie first, then Authorization header, then ?token= query param
    const token =
      req.cookies?.auth_token ||
      (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null) ||
      (typeof req.query.token === 'string' ? req.query.token : null);

    if (!token) {
      console.log('[privateFileAccess] No token found. cookies:', Object.keys(req.cookies || {}), 'origin:', req.headers.origin, 'referer:', req.headers.referer);
      const { appConfig: cfg } = require('@config/app');
      const loginUrl = cfg.frontendUrl;
      return res.redirect(302, loginUrl);
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "fallback-secret"
    );
    req.user = decoded;
    next();
  } catch (error) {
    console.log('[privateFileAccess] Token verification failed:', (error as Error).message);
    return ApiResponse.unauthorized(res, 'Invalid or expired token');
  }
}

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.auth_token;

    if (!token) {
      return ApiResponse.unauthorized(res, "Authentication required");
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "fallback-secret"
    );
    req.user = decoded;
    next();
  } catch (error) {
    return ApiResponse.unauthorized(res, 'Invalid or expired token');
  }
}

/**
 * Middleware to prevent authenticated users from accessing auth routes
 */
export function preventAuthenticatedAccess(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.auth_token;

    if (token) {
      jwt.verify(token, process.env.JWT_SECRET || "fallback-secret");
      return ApiResponse.error(res, "Already authenticated", 403);
    }

    next();
  } catch (error) {
    next();
  }
}

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.auth_token;

    if (token) {
      try {
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || "fallback-secret"
        );
        req.user = decoded;
      } catch (error) {
        // Token is invalid, but we don't fail the request
        req.user = null;
      }
    }
    
    next();
  } catch (error) {
    next();
  }
}

/**
 * Role-based authorization middleware
 */
export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return ApiResponse.unauthorized(res, 'Authentication required');
    }

    const userRole = req.user.role || 'user';
    
    if (!roles.includes(userRole)) {
      return ApiResponse.forbidden(res, 'Insufficient permissions');
    }

    next();
  };
}

/**
 * Verify email middleware
 * Ensures user's email is verified
 */

export function requireEmailVerified(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return ApiResponse.unauthorized(res, 'Authentication required');
  }

  if (!req.user.email_verified_at) {
    return ApiResponse.forbidden(res, 'Email verification required');
  }

  next();
}
