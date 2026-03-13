"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTokenAndSetCookie = generateTokenAndSetCookie;
exports.generateRefreshToken = generateRefreshToken;
exports.getRefreshCookieOptions = getRefreshCookieOptions;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const loggerService_1 = require("@services/loggerService");
function generateTokenAndSetCookie(user, rememberMe = false) {
    const tokenExpiry = rememberMe ? "7d" : "24h";
    const cookieMaxAge = rememberMe
        ? 7 * 24 * 60 * 60 * 1000
        : 24 * 60 * 60 * 1000;
    const token = jsonwebtoken_1.default.sign({
        id: user.id,
        unique_id: user.unique_id || user.id,
        email: user.email,
        phone: user.phone,
        rememberMe: rememberMe,
        role: user.role ?? undefined,
        profile_type: user.profile_type ?? undefined,
    }, process.env.JWT_SECRET || "fallback-secret", { expiresIn: tokenExpiry });
    const cookieOptions = {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: cookieMaxAge,
        path: "/",
        domain: undefined,
    };
    loggerService_1.Log.info(`🍪 Token generated with ${rememberMe ? "7 days" : "24 hours"} expiry`);
    return { token, cookieOptions, expiresIn: tokenExpiry };
}
/** Generate an opaque refresh token and its DB expiry date */
function generateRefreshToken(rememberMe = false) {
    const token = crypto_1.default.randomBytes(64).toString("hex");
    const days = rememberMe ? 30 : 7;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    return { token, expiresAt };
}
/** Refresh cookie options (long-lived, httpOnly) */
function getRefreshCookieOptions(expiresAt) {
    return {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        expires: expiresAt,
        path: "/",
        domain: undefined,
    };
}
