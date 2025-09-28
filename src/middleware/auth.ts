import { Request, Response, NextFunction } from 'express';
import { verifyJwtToken, extractTokenFromHeader } from '@utils/jwtUtils';
import { ApiResponse } from '@utils/ApiResponse';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

/**
 * Authentication middleware
 * Verifies JWT token and adds user to request object
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return ApiResponse.unauthorized(res, 'Access token is required');
    }

    const decoded = verifyJwtToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return ApiResponse.unauthorized(res, 'Invalid or expired token');
  }
}

/**
 * Optional authentication middleware
 * Adds user to request if token is valid, but doesn't require it
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (token) {
      try {
        const decoded = verifyJwtToken(token);
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
