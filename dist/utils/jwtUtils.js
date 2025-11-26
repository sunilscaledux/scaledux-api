"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTokenAndSetCookie = generateTokenAndSetCookie;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function generateTokenAndSetCookie(user, rememberMe = false) {
    // Set expiration based on rememberMe flag
    const tokenExpiry = rememberMe ? "7d" : "24h";
    const cookieMaxAge = rememberMe
        ? 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
        : 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    const token = jsonwebtoken_1.default.sign({
        id: user.id,
        email: user.email,
        phone: user.phone,
        rememberMe: rememberMe,
    }, process.env.JWT_SECRET || "fallback-secret", { expiresIn: tokenExpiry });
    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: cookieMaxAge,
        path: "/",
    };
    console.log(`🍪 Token generated with ${rememberMe ? "7 days" : "24 hours"} expiry`);
    return { token, cookieOptions, expiresIn: tokenExpiry };
}
