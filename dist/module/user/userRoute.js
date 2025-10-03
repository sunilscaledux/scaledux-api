"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userController_1 = require("./userController");
const googleAuthController_1 = require("@module/auth/googleAuthController");
const linkedinAuthController_1 = require("@module/auth/linkedinAuthController");
const rateLimiter_1 = require("@middleware/rateLimiter");
const auth_1 = require("@middleware/auth");
const router = express_1.default.Router();
router.post("/request-otp", rateLimiter_1.otpRateLimiter, auth_1.preventAuthenticatedAccess, userController_1.requestOtp);
router.post("/verify-otp", rateLimiter_1.otpRateLimiter, userController_1.verifyOtp);
router.post("/resend-otp", rateLimiter_1.otpRateLimiter, auth_1.preventAuthenticatedAccess, userController_1.resendOtpUnified);
router.post("/register", rateLimiter_1.generalRateLimiter, auth_1.preventAuthenticatedAccess, userController_1.register);
router.post("/login", rateLimiter_1.generalRateLimiter, auth_1.preventAuthenticatedAccess, userController_1.login);
router.post("/check-user-exists", rateLimiter_1.generalRateLimiter, auth_1.preventAuthenticatedAccess, userController_1.checkUserExistsForLogin);
router.post("/reset-password", rateLimiter_1.generalRateLimiter, userController_1.resetPassword);
router.post("/logout", auth_1.authenticateToken, userController_1.logout);
router.get("/auth/me", auth_1.authenticateToken, userController_1.getCurrentUser);
// Google OAuth callback
router.post("/auth/google-callback", rateLimiter_1.generalRateLimiter, googleAuthController_1.googleCallback);
// LinkedIn OAuth callback
router.post("/auth/linkedin-callback", rateLimiter_1.generalRateLimiter, linkedinAuthController_1.linkedinCallback);
// Test cookies  - no authentication required
router.get("/test-cookies", userController_1.testCookies);
exports.default = router;
