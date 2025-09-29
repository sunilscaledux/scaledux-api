import Joi from 'joi';
import {
  RegisterInput,
  VerifyOtpInput,
  ResendOtpInput,
  LoginInput,
} from "./userTypes";


export const registerUserSchema = Joi.object<RegisterInput>({
  FirstName: Joi.string().min(1).required().messages({
    "any.required": "First name is required",
    "string.min": "First name is required",
  }),
  LastName: Joi.string().min(1).required().messages({
    "any.required": "Last name is required",
    "string.min": "Last name is required",
  }),
  email: Joi.string().required().messages({
    "any.required": "Email or phone number is required",
  }),
  password: Joi.string().min(8).required().messages({
    "any.required": "Password is required",
    "string.min": "Password must be at least 8 characters long",
  }),
  terms: Joi.boolean().valid(true).required().messages({
    "any.required": "You must accept the terms",
    "any.only": "You must accept the terms",
  }),
  notification: Joi.boolean().optional(),
});

export const loginUserSchema = Joi.object<LoginInput>({
  email: Joi.string().email().optional().allow(null, "").messages({
    "any.required": "Email is required",
    "string.email": "Please enter valid email address",
  }),
  phone: Joi.string()
    .pattern(/^[0-9]{7,15}$/)
    .optional()
    .allow(null, "")
    .messages({
      "string.pattern.base":
        "Phone number must contain only digits (7-15 characters)",
    }),
  password: Joi.string().required().messages({
    "any.required": "Password is required",
    "string.min": "Password must be at least 8 characters long",
  }),
})
  .custom((value, helpers) => {
    if (!value.email && !value.phone) {
      return helpers.error("custom.emailOrPhone");
    }
    return value;
  })
  .messages({
    "custom.emailOrPhone": "Either email or phone number is required",
  });

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
  identifier: Joi.string().required()
    .messages({
      'any.required': 'Email or phone number is required'
    })
});

