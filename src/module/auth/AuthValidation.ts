import Joi from 'joi';
import {
  RegisterInput,
  VerifyOtpInput,
  ResendOtpInput,
  LoginInput,
} from "./AuthTypes";
import { isDisposableEmail } from "@utils/disposableEmailValidator";

function rejectDisposableEmail(value: string, helpers: Joi.CustomHelpers) {
  if (value && value.includes('@') && isDisposableEmail(value)) {
    return helpers.error('string.disposableEmail');
  }
  return value;
}

const disposableEmailMessage = {
  'string.disposableEmail': 'Disposable or temporary email addresses are not allowed. Please use a permanent email address.',
};

export const registerUserSchema = Joi.object({
  first_name: Joi.string().min(2).max(50).required().messages({
    "string.min": "First name must be at least 2 characters long",
    "string.max": "First name must not exceed 50 characters",
    "any.required": "First name is required",
  }),
  last_name: Joi.string().min(2).max(50).optional().allow("").messages({
    "string.min": "Last name must be at least 2 characters long",
    "string.max": "Last name must not exceed 50 characters",
  }),
  email: Joi.string().required().custom(rejectDisposableEmail).messages({
    "any.required": "Email or phone number is required",
    ...disposableEmailMessage,
  }),
  password: Joi.string().min(8).required().messages({
    "any.required": "Password is required",
    "string.min": "Password must be at least 8 characters long",
  }),
  terms: Joi.boolean().optional(),
  notification: Joi.boolean().optional(),
});

export const loginUserSchema = Joi.object<LoginInput>({
  // Holds an email OR a phone — userLogin() splits it via normalizeContact.
  // .email() here rejected every phone before the password was ever checked.
  email: Joi.string().optional().allow(null, "").custom(rejectDisposableEmail).messages({
    "any.required": "Email is required",
    ...disposableEmailMessage,
  }),
  password: Joi.string().required().messages({
    "any.required": "Password is required",
    "string.min": "Password must be at least 8 characters long",
  }),
  rememberMe: Joi.boolean().optional().default(false),
})

export const verifyOtpSchema = Joi.object<VerifyOtpInput>({
  identifier: Joi.string().required().messages({
    "any.required": "Email or phone number is required",
  }),
  otp: Joi.string()
    .length(6)
    .pattern(/^[0-9]+$/)
    .required()
    .messages({
      "any.required": "OTP is required",
      "string.length": "OTP must be exactly 6 digits",
      "string.pattern.base": "OTP must contain only numbers",
    }),
});

export const resendOtpSchema = Joi.object<ResendOtpInput>({
  identifier: Joi.string().required().custom(rejectDisposableEmail).messages({
    "any.required": "Email or phone number is required",
    ...disposableEmailMessage,
  }),
});

export const unifiedOtpRequestSchema = Joi.object({
  identifier: Joi.string().required().custom(rejectDisposableEmail).messages({
    "any.required": "Email or phone number is required",
    ...disposableEmailMessage,
  }),
  type: Joi.string()
    .valid("registration", "login", "forgot")
    .required()
    .messages({
      "any.required": "OTP type is required",
      "any.only": "OTP type must be: registration, login, or forgot",
    }),
});

export const unifiedVerifyOtpSchema = Joi.object({
  identifier: Joi.string().required().messages({
    "any.required": "Email or phone number is required",
  }),
  otp: Joi.string()
    .length(6)
    .pattern(/^[0-9]+$/)
    .required()
    .messages({
      "any.required": "OTP is required",
      "string.length": "OTP must be exactly 6 digits",
      "string.pattern.base": "OTP must contain only numbers",
    }),
  type: Joi.string()
    .valid("registration", "login", "forgot")
    .required()
    .messages({
      "any.required": "OTP type is required",
      "any.only": "OTP type must be: registration, login, or forgot",
    }),
});

export const resetPasswordSchema = Joi.object({
  identifier: Joi.string().required().custom(rejectDisposableEmail).messages({
    "any.required": "Email or phone number is required",
    ...disposableEmailMessage,
  }),
  password: Joi.string().min(8).required().messages({
    "any.required": "Password is required",
    "string.min": "Password must be at least 8 characters long",
  }),
});

