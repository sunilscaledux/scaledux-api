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
      // Verify token is valid
      jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
      // User is authenticated, they shouldn't access auth routes
      return ApiResponse.error(res, 'Already authenticated', 403);
    }

    next();
  } catch (error) {
    // Invalid token, allow access to auth routes
    next();
  }
}

/**
 * Optional authentication middleware
 * Adds user to request if token is valid, but doesn't require it
 */
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
