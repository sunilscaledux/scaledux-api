"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generalRateLimiter = exports.otpRateLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const rate_limit_redis_1 = __importDefault(require("rate-limit-redis"));
const redisService_1 = __importDefault(require("@services/redisService"));
exports.otpRateLimiter = (0, express_rate_limit_1.default)({
    store: new rate_limit_redis_1.default({
        sendCommand: (...args) => {
            const [command, ...commandArgs] = args;
            return redisService_1.default[command.toLowerCase()](...commandArgs);
        },
    }),
    windowMs: 15 * 60 * 1000, // 10 minutes
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: "Too many OTP resend attempts. Please try again after 15 minutes.",
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
exports.generalRateLimiter = (0, express_rate_limit_1.default)({
    store: new rate_limit_redis_1.default({
        sendCommand: (...args) => {
            const [command, ...commandArgs] = args;
            return redisService_1.default[command.toLowerCase()](...commandArgs);
        },
    }),
    windowMs: 5 * 60 * 1000, // 15 minutes
    max: 50, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
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
