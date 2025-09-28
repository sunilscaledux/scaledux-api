import { Request, Response } from 'express';
import { checkUserExists, createTempUser, createUserAfterOtpVerification, getTempUserByEmailOrPhone, deleteTempUser } from './userService';
import { RegisterInput, VerifyOtpInput, ResendOtpInput } from './userTypes';
import { registerUserSchema, verifyOtpSchema, resendOtpSchema } from './userValidation';
import { ApiResponse } from '@utils/ApiResponse';
import { otpService } from '@module/user/otpService';

export async function register(req: Request, res: Response) {
  const bodyToValidate = req.body || {};
  
  const { error, value } = registerUserSchema.validate(bodyToValidate, {
    abortEarly: false,
  });
  if (error) {
    return ApiResponse.joiValidationError(res, error);
  }
  
  try {
    const body: RegisterInput = value;
    
    // Validate that at least one contact method is provided
    if (!body.email && !body.phone) {
      return ApiResponse.error(res, 'Either email or phone number is required');
    }
    
    const isUserExist = await checkUserExists(body.email, body.phone);
    if (isUserExist) {
      return ApiResponse.error(res, 'User already exists');
    }
    
    // Store temp user
    await createTempUser(body);
    
    // Generate and send OTP
    const input = { email: body.email, phone: body.phone };
    const otpResult = await otpService.generateAndSendOtp(input, body.FirstName);
    
    if (!otpResult.success) {
      // Remove stored data if OTP generation fails
      await deleteTempUser(body);
      return ApiResponse.error(res, otpResult.message);
    }
    
    const contactMethod = body.email ? 'email' : 'phone';
    const contactValue = body.email || body.phone;
    
    return ApiResponse.success(res, {
      identifier: contactValue,
      contactMethod,
      message: `OTP sent to your ${contactMethod}. Please verify to complete registration.`,
      expiresIn: 600 // 10 minutes
    }, `Registration initiated. Please check your ${contactMethod} for OTP.`);
    
  } catch (err: any) {
    return ApiResponse.error(res, err.message);
  }
}

export async function verifyEmailOtp(req: Request, res: Response) {
  const bodyToValidate = req.body || {};
  
  const { error, value } = verifyOtpSchema.validate(bodyToValidate, {
    abortEarly: false,
  });
  
  if (error) {
    return ApiResponse.joiValidationError(res, error);
  }
  
  try {
    const { identifier, otp }: VerifyOtpInput = value;
    
    // Verify OTP - pass identifier (email or phone)
    const verifyResult = await otpService.verifyOtp(identifier, otp);
    
    if (!verifyResult.success) {
      return ApiResponse.error(res, verifyResult.message);
    }
    
    // Get stored registration data from temp user
    const registrationData = await getTempUserByEmailOrPhone(identifier);
    
    if (!registrationData) {
      return ApiResponse.error(res, 'Registration data not found. Please register again.');
    }
    
    // Create user account
    const user = await createUserAfterOtpVerification(registrationData);
    
    // Delete temp user after successful registration
    await deleteTempUser(identifier);
    
    return ApiResponse.created(res, {
      user,
      verified: true
    }, 'Registration completed successfully. You can now login.');
    
  } catch (err: any) {
    return ApiResponse.error(res, err.message);
  }
}

export async function resendOtp(req: Request, res: Response) {
  const bodyToValidate = req.body || {};
  
  const { error, value } = resendOtpSchema.validate(bodyToValidate, {
    abortEarly: false,
  });
  
  if (error) {
    return ApiResponse.joiValidationError(res, error);
  }
  
  try {
    const { identifier }: ResendOtpInput = value;
    
    // Check if temp user exists
    const registrationData = await getTempUserByEmailOrPhone(identifier);
    
    if (!registrationData) {
      return ApiResponse.error(res, 'No pending registration found for this identifier. Please register again.');
    }
    
    // Prepare input for OTP service
    const input = { email: registrationData.email, phone: registrationData.phone };
    
    // Resend OTP
    const resendResult = await otpService.resendEmailOtp(input, registrationData.FirstName);
    
    if (!resendResult.success) {
      return ApiResponse.error(res, resendResult.message);
    }
    
    const verificationType = registrationData.email === identifier ? 'email' : 'phone';
    
    return ApiResponse.success(res, {
      identifier,
      expiresIn: 600 // 10 minutes
    }, `OTP resent successfully. Please check your ${verificationType}.`);
    
  } catch (err: any) {
    return ApiResponse.error(res, err.message);
  }
}
