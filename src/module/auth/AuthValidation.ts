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

const FULL_NAME_PATTERN = /^[A-Za-z]+(?:\s+[A-Za-z]+)*$/;

export const registerUserSchema = Joi.object({
  full_name: Joi.string().trim().min(2).max(100).pattern(FULL_NAME_PATTERN).messages({
    "string.min": "Full name must be at least 2 characters long",
    "string.max": "Full name must not exceed 100 characters",
    "string.pattern.base": "Full name can contain only letters and spaces",
  }),
  first_name: Joi.string().min(2).max(50).pattern(FULL_NAME_PATTERN).messages({
    "string.min": "First name must be at least 2 characters long",
    "string.max": "First name must not exceed 50 characters",
    "string.pattern.base": "Name can contain only letters and spaces",
  }),
  last_name: Joi.string().min(2).max(50).pattern(FULL_NAME_PATTERN).optional().allow("").messages({
    "string.min": "Last name must be at least 2 characters long",
    "string.max": "Last name must not exceed 50 characters",
    "string.pattern.base": "Name can contain only letters and spaces",
  }),
  identifier: Joi.string().required().custom(rejectDisposableEmail).messages({
    "any.required": "Email or phone number is required",
    "string.empty": "Email or phone number is required",
    ...disposableEmailMessage,
  }),
  password: Joi.string().min(8).required().messages({
    "any.required": "Password is required",
    "string.min": "Password must be at least 8 characters long",
  }),
  terms: Joi.boolean().optional(),
  notification: Joi.boolean().optional(),
}).or('full_name', 'first_name').messages({
  'object.missing': 'Full name is required',
});

export const loginUserSchema = Joi.object<LoginInput>({
  identifier: Joi.string().required().custom(rejectDisposableEmail).messages({
    "any.required": "Email or phone number is required",
    "string.empty": "Email or phone number is required",
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

