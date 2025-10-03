"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPasswordSchema = exports.unifiedVerifyOtpSchema = exports.unifiedOtpRequestSchema = exports.resendOtpSchema = exports.verifyOtpSchema = exports.loginUserSchema = exports.registerUserSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.registerUserSchema = joi_1.default.object({
    FirstName: joi_1.default.string().min(1).required().messages({
        "any.required": "First name is required",
        "string.min": "First name is required",
    }),
    LastName: joi_1.default.string().min(1).required().messages({
        "any.required": "Last name is required",
        "string.min": "Last name is required",
    }),
    email: joi_1.default.string().required().messages({
        "any.required": "Email or phone number is required",
    }),
    password: joi_1.default.string().min(8).required().messages({
        "any.required": "Password is required",
        "string.min": "Password must be at least 8 characters long",
    }),
    terms: joi_1.default.boolean().valid(true).required().messages({
        "any.required": "You must accept the terms",
        "any.only": "You must accept the terms",
    }),
    notification: joi_1.default.boolean().optional(),
});
exports.loginUserSchema = joi_1.default.object({
    email: joi_1.default.string().email().optional().allow(null, "").messages({
        "any.required": "Email is required",
        "string.email": "Please enter valid email address",
    }),
    password: joi_1.default.string().required().messages({
        "any.required": "Password is required",
        "string.min": "Password must be at least 8 characters long",
    }),
    rememberMe: joi_1.default.boolean().optional().default(false),
});
exports.verifyOtpSchema = joi_1.default.object({
    identifier: joi_1.default.string().required().messages({
        "any.required": "Email or phone number is required",
    }),
    otp: joi_1.default.string()
        .length(6)
        .pattern(/^[0-9]+$/)
        .required()
        .messages({
        "any.required": "OTP is required",
        "string.length": "OTP must be exactly 6 digits",
        "string.pattern.base": "OTP must contain only numbers",
    }),
});
exports.resendOtpSchema = joi_1.default.object({
    identifier: joi_1.default.string().required().messages({
        "any.required": "Email or phone number is required",
    }),
});
exports.unifiedOtpRequestSchema = joi_1.default.object({
    identifier: joi_1.default.string().required().messages({
        "any.required": "Email or phone number is required",
    }),
    type: joi_1.default.string()
        .valid("registration", "login", "forgot-password")
        .required()
        .messages({
        "any.required": "OTP type is required",
        "any.only": "OTP type must be: registration, login, or forgot-password",
    }),
});
exports.unifiedVerifyOtpSchema = joi_1.default.object({
    identifier: joi_1.default.string().required().messages({
        "any.required": "Email or phone number is required",
    }),
    otp: joi_1.default.string()
        .length(6)
        .pattern(/^[0-9]+$/)
        .required()
        .messages({
        "any.required": "OTP is required",
        "string.length": "OTP must be exactly 6 digits",
        "string.pattern.base": "OTP must contain only numbers",
    }),
    type: joi_1.default.string()
        .valid("registration", "login", "forgot-password")
        .required()
        .messages({
        "any.required": "OTP type is required",
        "any.only": "OTP type must be: registration, login, or forgot-password",
    }),
});
exports.resetPasswordSchema = joi_1.default.object({
    identifier: joi_1.default.string().required().messages({
        "any.required": "Email or phone number is required",
    }),
    password: joi_1.default.string().min(8).required().messages({
        "any.required": "Password is required",
        "string.min": "Password must be at least 8 characters long",
    }),
});
