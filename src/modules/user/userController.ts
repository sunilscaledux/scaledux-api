import { Request, Response } from 'express';
import { checkUserExists, createTempUser, createUserAfterOtpVerification, getTempUserByEmail, deleteTempUser } from './userService';
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
    
    const isUserExist=await checkUserExists(body.email,body.phone);
    if (isUserExist) {
      return ApiResponse.error(res,'user already exist')
    }
    
    //store temp user
    await createTempUser(body)
    

    // Generate and send OTP
    const input={email:body.email,phone:body.phone};
     await otpService.generateAndSendOtp(input, body.FirstName);
    
    
    return ApiResponse.success(res, {
      email: body.email,
      message: 'OTP sent to your email address. Please verify to complete registration.',
      expiresIn: 600 // 10 minutes
    }, 'Registration initiated. Please check your email for OTP.');
    
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
    const { email, otp }: VerifyOtpInput = value;
    
    // Verify OTP
    const verifyResult = await otpService.verifyOtp(email, otp);
    
    if (!verifyResult.success) {
      return ApiResponse.error(res, verifyResult.message);
    }
    
    // Get stored registration data from temp user
    const registrationData = await getTempUserByEmailOrPhone(email);
    
    if (!registrationData) {
      return ApiResponse.error(res, 'Registration data not found. Please register again.');
    }
    
    // Create user account
    const user = await createUserAfterOtpVerification(registrationData);
    
    // Delete temp user after successful registration
    await deleteTempUser(email);
    
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
    const { email }: ResendOtpInput = value;
    
    // Check if registration data exists
    const registrationData = registrationStore.getRegistrationData(email);
    
    if (!registrationData) {
      return ApiResponse.error(res, 'No pending registration found for this email. Please register again.');
    }
    
    // Resend OTP
    const resendResult = await otpService.resendEmailOtp(email, registrationData.FirstName);
    
    if (!resendResult.success) {
      return ApiResponse.error(res, resendResult.message);
    }
    
    return ApiResponse.success(res, {
      email,
      expiresIn: 600 // 10 minutes
    }, 'OTP resent successfully. Please check your email.');
    
  } catch (err: any) {
    return ApiResponse.error(res, err.message);
  }
}
