import Joi from 'joi';
import { RegisterInput, VerifyOtpInput, ResendOtpInput } from './userTypes';

export const registerUserSchema = Joi.object<RegisterInput>({
  FirstName: Joi.string().trim().min(2).max(50).required()
    .messages({
      'any.required': 'First name is required',
      'string.min': 'First name must be at least 2 characters',
      'string.max': 'First name cannot exceed 50 characters'
    }),
  LastName: Joi.string().trim().max(50).optional().allow(null, '')
    .messages({
      'string.max': 'Last name cannot exceed 50 characters'
    }),
  email: Joi.string().email().required()
    .messages({
      'any.required': 'Email is required',
      'string.email': 'Please enter a valid email address'
    }),
  phone: Joi.string()
    .pattern(/^[0-9]{7,15}$/)
    .optional()
    .allow(null, '')
    .messages({
      'string.pattern.base': 'Phone number must contain only digits (7-15 characters)'
    }),
  password: Joi.string().min(6).required()
    .messages({
      'any.required': 'Password is required',
      'string.min': 'Password must be at least 6 characters long'
    })
});

export const verifyOtpSchema = Joi.object<VerifyOtpInput>({
  email: Joi.string().email().required()
    .messages({
      'any.required': 'Email is required',
      'string.email': 'Please enter a valid email address'
    }),
  otp: Joi.string().length(6).pattern(/^[0-9]+$/).required()
    .messages({
      'any.required': 'OTP is required',
      'string.length': 'OTP must be exactly 6 digits',
      'string.pattern.base': 'OTP must contain only numbers'
    })
});

export const resendOtpSchema = Joi.object<ResendOtpInput>({
  email: Joi.string().email().required()
    .messages({
      'any.required': 'Email is required',
      'string.email': 'Please enter a valid email address'
    })
});

