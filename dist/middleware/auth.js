"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = authenticateToken;
exports.preventAuthenticatedAccess = preventAuthenticatedAccess;
exports.optionalAuth = optionalAuth;
exports.requireRole = requireRole;
exports.requireEmailVerified = requireEmailVerified;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const ApiResponse_1 = require("@utils/ApiResponse");
function authenticateToken(req, res, next) {
    try {
        const token = req.cookies?.auth_token;
        if (!token) {
            return ApiResponse_1.ApiResponse.unauthorized(res, "Authentication required");
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || "fallback-secret");
        req.user = decoded;
        next();
    }
    catch (error) {
        return ApiResponse_1.ApiResponse.unauthorized(res, 'Invalid or expired token');
    }
}
/**
 * Middleware to prevent authenticated users from accessing auth routes
 */
function preventAuthenticatedAccess(req, res, next) {
    try {
        const token = req.cookies?.auth_token;
        if (token) {
            jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || "fallback-secret");
            return ApiResponse_1.ApiResponse.error(res, "Already authenticated", 403);
        }
        next();
    }
    catch (error) {
        next();
    }
}
function optionalAuth(req, res, next) {
    try {
        const token = req.cookies?.auth_token;
        if (token) {
            try {
                const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || "fallback-secret");
                req.user = decoded;
            }
            catch (error) {
                // Token is invalid, but we don't fail the request
                req.user = null;
            }
        }
        next();
    }
    catch (error) {
        next();
    }
}
/**
 * Role-based authorization middleware
 */
function requireRole(roles) {
    return (req, res, next) => {
        if (!req.user) {
            return ApiResponse_1.ApiResponse.unauthorized(res, 'Authentication required');
        }
        const userRole = req.user.role || 'user';
        if (!roles.includes(userRole)) {
            return ApiResponse_1.ApiResponse.forbidden(res, 'Insufficient permissions');
        }
        next();
    };
}
/**
 * Verify email middleware
 * Ensures user's email is verified
 */
function requireEmailVerified(req, res, next) {
    if (!req.user) {
        return ApiResponse_1.ApiResponse.unauthorized(res, 'Authentication required');
    }
    if (!req.user.email_verified_at) {
        return ApiResponse_1.ApiResponse.forbidden(res, 'Email verification required');
    }
    next();
}
