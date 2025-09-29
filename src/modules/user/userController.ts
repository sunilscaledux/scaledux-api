import { Request, Response } from 'express';
import {
  checkUserExists,
  userLogin,
  normalizeContact,
  createUserAfterOtpVerification,
} from "./userService";
import {
  RegisterInput,
  VerifyOtpInput,
  ResendOtpInput,
  LoginInput,
} from "./userTypes";
import {
  registerUserSchema,
  verifyOtpSchema,
  resendOtpSchema,
  loginUserSchema,
} from "./userValidation";
import { ApiResponse } from "@utils/ApiResponse";
import { otpService } from "@module/user/otpService";

export async function initiateRegistration(req: Request, res: Response) {
  const rawBody = req.body || {};
  const contactInfo = normalizeContact(rawBody.identifier);
  const { error, value } = resendOtpSchema.validate(rawBody, {
    abortEarly: false,
  });
  if (error) {
    return ApiResponse.joiValidationError(res, error);
  }

  try {
    const body: ResendOtpInput = value;

    const isUserExist = await checkUserExists(body.identifier);
    if (isUserExist) {
      return ApiResponse.error(res, "User already exists");
    }

    // Generate and send OTP with registration data
    const otpResult = await otpService.generateAndSendOtp({
      email: contactInfo.email || undefined,
      phone: contactInfo.phone || undefined,
      otpType: contactInfo.email ? "EMAIL_VERIFICATION" : "PHONE_VERIFICATION",
    });

    if (!otpResult.success) {
      return ApiResponse.error(res, otpResult.message);
    }

    const contactMethod = contactInfo.email ? "email" : "phone";

    return ApiResponse.success(
      res,
      {
        identifier: body.identifier,
      },
      `Registration initiated. Please check your ${contactMethod} for OTP.`
    );
  } catch (err: any) {
    return ApiResponse.error(res, err.message);
  }
}

export async function register(req: Request, res: Response) {
  // return initiateRegistration(req, res);
}

export async function login(req: Request, res: Response) {
  const rawBody = req.body || {};
  // Accept a single identifier in `email` which may be an email or phone
  const contactInfo = normalizeContact(rawBody.email);
  const bodyToValidate = { ...rawBody, ...contactInfo };

  const { error, value } = loginUserSchema.validate(bodyToValidate, {
    abortEarly: false,
  });

  if (error) {
    return ApiResponse.joiValidationError(res, error);
  }

  try {
    const body: LoginInput = value;

    // Attempt to login user
    const loginResult = await userLogin(body);
    if (!loginResult.success) {
      return ApiResponse.error(res, loginResult.message);
    }

    return ApiResponse.success(
      res,
      {
        user: loginResult.user,
        token: loginResult.token,
        expiresIn: "24h",
      },
      "Login successful"
    );
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

    // Verify OTP using otpService
    const response = await otpService.verifyOtp(identifier, otp);

    if (!response.success) {
      return ApiResponse.error(res, response.message);
    }

    return ApiResponse.success(
      res,
      {
        identifier: identifier,
      },
      "OTP verified successfully. You can now complete registration."
    );
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

    const contactInfo = normalizeContact(identifier);

    // Resend OTP using otpService
    const resendResult = await otpService.resendOtp({
      email: contactInfo.email || undefined,
      phone: contactInfo.phone || undefined,
    });

    if (!resendResult.success) {
      return ApiResponse.error(res, resendResult.message);
    }

    const verificationType = contactInfo.email ? "email" : "phone";

    return ApiResponse.success(
      res,
      {
        identifier,
        expiresIn: 600, // 10 minutes
      },
      `OTP resent successfully. Please check your ${verificationType}.`
    );
  } catch (err: any) {
    return ApiResponse.error(res, err.message);
  }
}
