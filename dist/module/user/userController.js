"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initiateRegistration = initiateRegistration;
exports.register = register;
exports.login = login;
exports.checkUserExistsForLogin = checkUserExistsForLogin;
exports.resendOtp = resendOtp;
exports.requestOtp = requestOtp;
exports.verifyOtp = verifyOtp;
exports.resendOtpUnified = resendOtpUnified;
exports.resetPassword = resetPassword;
exports.logout = logout;
exports.testCookies = testCookies;
exports.getCurrentUser = getCurrentUser;
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma_1 = require("../../config/prisma");
const jwtUtils_1 = require("@utils/jwtUtils");
const userService_1 = require("./userService");
const userValidation_1 = require("./userValidation");
const ApiResponse_1 = require("@utils/ApiResponse");
const otpService_1 = require("@module/user/otpService");
async function initiateRegistration(req, res) {
    const rawBody = req.body || {};
    const contactInfo = (0, userService_1.normalizeContact)(rawBody.identifier);
    const { error, value } = userValidation_1.resendOtpSchema.validate(rawBody, {
        abortEarly: false,
    });
    if (error) {
        return ApiResponse_1.ApiResponse.joiValidationError(res, error);
    }
    try {
        const body = value;
        const contactMethod = contactInfo.email ? "email" : "phone";
        const isUserExist = await (0, userService_1.checkUserExists)(body.identifier);
        if (isUserExist) {
            return ApiResponse_1.ApiResponse.error(res, `This ${contactMethod} is already in use.`);
        }
        // Generate and send OTP with registration data
        const otpResult = await otpService_1.otpService.generateAndSendOtp({
            email: contactInfo.email || undefined,
            phone: contactInfo.phone || undefined,
            otpType: "REGISTRATION_VERIFICATION",
        });
        if (!otpResult.success) {
            return ApiResponse_1.ApiResponse.error(res, otpResult.message);
        }
        return ApiResponse_1.ApiResponse.success(res, {
            identifier: body.identifier,
        }, `Registration initiated. Please check your ${contactMethod} for OTP.`);
    }
    catch (err) {
        return ApiResponse_1.ApiResponse.error(res, err.message);
    }
}
async function register(req, res) {
    const rawBody = req.body || {};
    const contactInfo = (0, userService_1.normalizeContact)(rawBody.email);
    const { error, value } = userValidation_1.registerUserSchema.validate(rawBody, {
        abortEarly: false,
    });
    if (error) {
        return ApiResponse_1.ApiResponse.joiValidationError(res, error);
    }
    try {
        const identifier = contactInfo.email || contactInfo.phone;
        if (!identifier) {
            return ApiResponse_1.ApiResponse.error(res, "Valid email or phone number is required");
        }
        // Check if user already exists
        const isUserExist = await (0, userService_1.checkUserExists)(identifier);
        if (isUserExist) {
            const contactMethod = contactInfo.email ? "email" : "phone";
            return ApiResponse_1.ApiResponse.error(res, `This ${contactMethod} is already in use.`);
        }
        // Check if OTP is verified for this identifier
        const registrationData = await otpService_1.otpService.getRegistrationData(identifier);
        if (!registrationData || !registrationData.verified) {
            return ApiResponse_1.ApiResponse.error(res, "Please verify your email/phone number first before completing registration.");
        }
        const userResult = await (0, userService_1.createUserAfterOtpVerification)(rawBody);
        if (!userResult.success) {
            return ApiResponse_1.ApiResponse.error(res, userResult.message);
        }
        // Generate token, set cookie, and get token for response
        const { token, cookieOptions, expiresIn } = (0, jwtUtils_1.generateTokenAndSetCookie)(userResult.data, false);
        res.cookie("auth_token", token, cookieOptions);
        return ApiResponse_1.ApiResponse.created(res, {
            user: {
                id: userResult.data.id,
                firstName: userResult.data.FirstName,
                lastName: userResult.data.LastName,
                email: userResult.data.email,
                phone: userResult.data.phone,
            },
            token,
            authenticated: true,
            expiresIn: expiresIn,
        }, userResult.message);
    }
    catch (err) {
        return ApiResponse_1.ApiResponse.error(res, err.message);
    }
}
async function login(req, res) {
    const rawBody = req.body || {};
    const { error, value } = userValidation_1.loginUserSchema.validate(rawBody, {
        abortEarly: false,
    });
    if (error) {
        return ApiResponse_1.ApiResponse.joiValidationError(res, error);
    }
    try {
        const body = value;
        // Attempt to login user
        const loginResult = await (0, userService_1.userLogin)(body);
        if (!loginResult.success) {
            return ApiResponse_1.ApiResponse.error(res, loginResult.message);
        }
        // Generate token and cookie options with rememberMe
        const { token, cookieOptions, expiresIn } = (0, jwtUtils_1.generateTokenAndSetCookie)(loginResult.data, body.rememberMe || false);
        res.cookie("auth_token", token, cookieOptions);
        return ApiResponse_1.ApiResponse.success(res, {
            user: loginResult.data,
            token,
            authenticated: true,
            expiresIn: expiresIn,
            rememberMe: body.rememberMe || false,
        }, loginResult.message);
    }
    catch (err) {
        return ApiResponse_1.ApiResponse.error(res, err.message);
    }
}
async function checkUserExistsForLogin(req, res) {
    const rawBody = req.body || {};
    const contactInfo = (0, userService_1.normalizeContact)(rawBody.identifier);
    const { error, value } = userValidation_1.resendOtpSchema.validate(rawBody, {
        abortEarly: false,
    });
    if (error) {
        return ApiResponse_1.ApiResponse.joiValidationError(res, error);
    }
    try {
        const body = value;
        const contactMethod = contactInfo.email ? "email" : "phone";
        const isUserExist = await (0, userService_1.checkUserExists)(body.identifier);
        if (!isUserExist) {
            return ApiResponse_1.ApiResponse.error(res, `No account found with this ${contactMethod}. Please sign up first.`);
        }
        return ApiResponse_1.ApiResponse.success(res, {
            identifier: body.identifier,
            exists: true,
        }, `User found. Please enter your password.`);
    }
    catch (err) {
        return ApiResponse_1.ApiResponse.error(res, err.message);
    }
}
async function resendOtp(req, res) {
    const bodyToValidate = req.body || {};
    const { error, value } = userValidation_1.resendOtpSchema.validate(bodyToValidate, {
        abortEarly: false,
    });
    if (error) {
        return ApiResponse_1.ApiResponse.joiValidationError(res, error);
    }
    try {
        const { identifier } = value;
        const contactInfo = (0, userService_1.normalizeContact)(identifier);
        // Resend OTP using otpService
        const resendResult = await otpService_1.otpService.resendOtp({
            email: contactInfo.email || undefined,
            phone: contactInfo.phone || undefined,
        });
        if (!resendResult.success) {
            return ApiResponse_1.ApiResponse.error(res, resendResult.message);
        }
        const verificationType = contactInfo.email ? "email" : "phone";
        return ApiResponse_1.ApiResponse.success(res, {
            identifier,
            expiresIn: 600, // 10 minutes
        }, `OTP resent successfully. Please check your ${verificationType}.`);
    }
    catch (err) {
        return ApiResponse_1.ApiResponse.error(res, err.message);
    }
}
async function requestOtp(req, res) {
    // Validate request body
    const { error, value } = userValidation_1.unifiedOtpRequestSchema.validate(req.body, {
        abortEarly: false,
    });
    if (error) {
        return ApiResponse_1.ApiResponse.joiValidationError(res, error);
    }
    try {
        const { identifier, type } = value;
        const contactInfo = (0, userService_1.normalizeContact)(identifier);
        const contactMethod = contactInfo.email ? "email" : "phone";
        if (!contactInfo.email && !contactInfo.phone) {
            return ApiResponse_1.ApiResponse.error(res, "Invalid email or phone format");
        }
        // Check user existence based on type
        const isUserExist = await (0, userService_1.checkUserExists)(identifier);
        switch (type) {
            case "registration":
                if (isUserExist) {
                    return ApiResponse_1.ApiResponse.error(res, `This ${contactMethod} is already in use.`);
                }
                break;
            case "login":
            case "forgot-password":
                if (!isUserExist) {
                    return ApiResponse_1.ApiResponse.error(res, `No account found with this ${contactMethod}. Please sign up first.`);
                }
                break;
        }
        // Map frontend types to backend OTP types
        const otpTypeMap = {
            registration: "REGISTRATION_VERIFICATION",
            login: "LOGIN_VERIFICATION",
            "forgot-password": "FORGOT_PASSWORD_VERIFICATION",
        };
        // Generate and send OTP
        const otpResult = await otpService_1.otpService.generateAndSendOtp({
            email: contactInfo.email || undefined,
            phone: contactInfo.phone || undefined,
            otpType: otpTypeMap[type],
        });
        if (!otpResult.success) {
            return ApiResponse_1.ApiResponse.error(res, otpResult.message);
        }
        // Success messages based on type
        const successMessages = {
            registration: `Registration initiated. Please check your ${contactMethod} for OTP.`,
            login: `Login OTP sent successfully. Please check your ${contactMethod}.`,
            "forgot-password": `Password reset OTP sent successfully. Please check your ${contactMethod}.`,
        };
        return ApiResponse_1.ApiResponse.success(res, {
            identifier,
            expiresIn: 600, // 10 minutes in seconds
        }, successMessages[type]);
    }
    catch (error) {
        console.error("Request OTP Error:", error);
        return ApiResponse_1.ApiResponse.error(res, "Failed to send OTP. Please try again.");
    }
}
async function verifyOtp(req, res) {
    const { error, value } = userValidation_1.unifiedVerifyOtpSchema.validate(req.body, {
        abortEarly: false,
    });
    if (error) {
        return ApiResponse_1.ApiResponse.joiValidationError(res, error);
    }
    try {
        const { identifier, otp, type } = value;
        // Map frontend types to backend OTP types
        const otpTypeMap = {
            registration: "REGISTRATION_VERIFICATION",
            login: "LOGIN_VERIFICATION",
            "forgot-password": "FORGOT_PASSWORD_VERIFICATION",
        };
        // Verify OTP using otpService
        const response = await otpService_1.otpService.verifyOtpByType(identifier, otp, otpTypeMap[type]);
        if (!response.success) {
            return ApiResponse_1.ApiResponse.error(res, response.message);
        }
        // Handle different verification types
        let responseData = {
            identifier,
            verified: true,
        };
        switch (type) {
            case "registration":
                responseData.message =
                    "OTP verified successfully. You can now complete registration.";
                break;
            case "login":
                // Perform OTP login to get user and token
                const loginResult = await (0, userService_1.userOtpLogin)(identifier);
                if (!loginResult.success || !loginResult.data) {
                    return ApiResponse_1.ApiResponse.error(res, loginResult.message || "User not found");
                }
                const { token, cookieOptions, expiresIn } = (0, jwtUtils_1.generateTokenAndSetCookie)(loginResult.data, false);
                res.cookie("auth_token", token, cookieOptions);
                responseData = {
                    user: loginResult.data,
                    token,
                    authenticated: true,
                    expiresIn: expiresIn,
                };
                responseData.message = "Login successful";
                break;
            case "forgot-password":
                responseData.message =
                    "Password reset OTP verified successfully. You can now reset your password.";
                break;
        }
        return ApiResponse_1.ApiResponse.success(res, responseData, responseData.message);
    }
    catch (error) {
        console.error("Verify OTP Error:", error);
        return ApiResponse_1.ApiResponse.error(res, "Failed to verify OTP. Please try again.");
    }
}
async function resendOtpUnified(req, res) {
    const { error, value } = userValidation_1.unifiedOtpRequestSchema.validate(req.body, {
        abortEarly: false,
    });
    if (error) {
        return ApiResponse_1.ApiResponse.joiValidationError(res, error);
    }
    try {
        const { identifier, type } = value;
        const contactInfo = (0, userService_1.normalizeContact)(identifier);
        const contactMethod = contactInfo.email ? "email" : "phone";
        if (!contactInfo.email && !contactInfo.phone) {
            return ApiResponse_1.ApiResponse.error(res, "Invalid email or phone format");
        }
        // Map frontend types to backend OTP types
        const otpTypeMap = {
            registration: "REGISTRATION_VERIFICATION",
            login: "LOGIN_VERIFICATION",
            "forgot-password": "FORGOT_PASSWORD_VERIFICATION",
        };
        // Resend OTP using otpService
        const resendResult = await otpService_1.otpService.resendOtpByType({
            email: contactInfo.email || undefined,
            phone: contactInfo.phone || undefined,
        }, otpTypeMap[type]);
        if (!resendResult.success) {
            return ApiResponse_1.ApiResponse.error(res, resendResult.message);
        }
        return ApiResponse_1.ApiResponse.success(res, {
            identifier,
            expiresIn: 600, // 10 minutes
        }, `OTP resent successfully. Please check your ${contactMethod}.`);
    }
    catch (error) {
        console.error("Resend OTP Error:", error);
        return ApiResponse_1.ApiResponse.error(res, "Failed to resend OTP. Please try again.");
    }
}
async function resetPassword(req, res) {
    // Validate request body
    const { error, value } = userValidation_1.resetPasswordSchema.validate(req.body, {
        abortEarly: false,
    });
    if (error) {
        return ApiResponse_1.ApiResponse.joiValidationError(res, error);
    }
    try {
        const { identifier, password } = value;
        const contactInfo = (0, userService_1.normalizeContact)(identifier);
        // Check if user exists
        const isUserExist = await (0, userService_1.checkUserExists)(identifier);
        if (!isUserExist) {
            const contactMethod = contactInfo.email ? "email" : "phone";
            return ApiResponse_1.ApiResponse.error(res, `No account found with this ${contactMethod}.`);
        }
        // Hash the new password
        const hashedPassword = await bcrypt_1.default.hash(password, 12);
        // Update user password in database
        const updatedUser = await prisma_1.prisma.user.updateMany({
            where: {
                OR: [{ email: contactInfo.email }, { phone: contactInfo.phone }].filter(Boolean),
            },
            data: {
                password: hashedPassword,
                updated_at: new Date(),
            },
        });
        if (updatedUser.count === 0) {
            return ApiResponse_1.ApiResponse.error(res, "Failed to update password. User not found.");
        }
        // Invalidate all existing OTPs for this user
        await prisma_1.prisma.otp.updateMany({
            where: {
                OR: [{ email: contactInfo.email }, { phone: contactInfo.phone }].filter(Boolean),
                verified: false,
            },
            data: { verified: true },
        });
        return ApiResponse_1.ApiResponse.success(res, { message: "Password reset successful" }, "Your password has been reset successfully. You can now login with your new password.");
    }
    catch (error) {
        console.error("Reset Password Error:", error);
        return ApiResponse_1.ApiResponse.error(res, "Failed to reset password. Please try again.");
    }
}
async function logout(req, res) {
    try {
        // Clear the authentication cookie
        res.clearCookie("auth_token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "none",
            path: "/",
        });
        return ApiResponse_1.ApiResponse.success(res, { message: "Logged out successfully" }, "You have been logged out successfully");
    }
    catch (error) {
        console.error("Logout Error:", error);
        return ApiResponse_1.ApiResponse.error(res, "Failed to logout. Please try again.");
    }
}
async function testCookies(req, res) {
    try {
        // Set a test cookie
        res.cookie("test_cookie", "test_value", {
            httpOnly: false, // Make it visible in browser for testing
            secure: false,
            sameSite: "none",
            maxAge: 60 * 1000, // 1 minute
            path: "/",
        });
        return ApiResponse_1.ApiResponse.success(res, {
            message: "Test cookie set",
            receivedCookies: req.cookies,
            headers: req.headers,
        }, "Cookie test successful");
    }
    catch (error) {
        console.error("Test Cookies Error:", error);
        return ApiResponse_1.ApiResponse.error(res, "Failed to test cookies");
    }
}
async function getCurrentUser(req, res) {
    try {
        // Debug: Log cookies received
        console.log("Cookies received:", req.cookies);
        console.log("Auth token from cookie:", req.cookies?.auth_token);
        // User is already attached to req by authenticateToken middleware
        const user = req.user;
        if (!user) {
            return ApiResponse_1.ApiResponse.unauthorized(res, "Not authenticated");
        }
        // Get full user details from database
        const userDetails = await prisma_1.prisma.user.findUnique({
            where: { id: user.userId },
            select: {
                id: true,
                FirstName: true,
                LastName: true,
                email: true,
                phone: true,
                email_verified_at: true,
                phone_verified_at: true,
                status: true
            }
        });
        if (!userDetails) {
            return ApiResponse_1.ApiResponse.error(res, "User not found");
        }
        return ApiResponse_1.ApiResponse.success(res, {
            user: {
                id: userDetails.id,
                firstName: userDetails.FirstName,
                lastName: userDetails.LastName,
                email: userDetails.email,
                phone: userDetails.phone,
                emailVerified: !!userDetails.email_verified_at,
                phoneVerified: !!userDetails.phone_verified_at,
                status: userDetails.status
            }
        }, "User details retrieved successfully");
    }
    catch (error) {
        console.error("Get Current User Error:", error);
        return ApiResponse_1.ApiResponse.error(res, "Failed to get user details");
    }
}
