import { Request, Response } from 'express';
import {
  checkUserExists,
  createTempUser,
  createUserAfterOtpVerification,
  deleteTempUser,
  userLogin,
  normalizeContact,
  getTempUser,
} from "./userService";
import {
  RegisterInput,
  VerifyOtpInput,
  ResendOtpInput,
  LoginInput,
  TempUserInput,
} from "./userTypes";
import {
  registerUserSchema,
  verifyOtpSchema,
  resendOtpSchema,
  loginUserSchema,
  tempUserSchema,
} from "./userValidation";
import { ApiResponse } from "@utils/ApiResponse";
import { otpService } from "@module/user/otpService";

export async function storeTempUser(req: Request, res: Response) {
  const rawBody = req.body || {};

  const contactInfo = normalizeContact(rawBody.email);

  const { error, value } = tempUserSchema.validate(rawBody, {
    abortEarly: false,
  });
  if (error) {
    return ApiResponse.joiValidationError(res, error);
  }

  try {
    const body: TempUserInput = value;

    const isUserExist = await checkUserExists(body.email);
    if (isUserExist) {
      return ApiResponse.error(res, "User already exists");
    }

    // Store temp user
    await createTempUser(body);

    // Generate and send OTP
    const input = { email: body.email };
    const otpResult = await otpService.generateAndSendOtp(
      input,
      body.FirstName
    );

    if (!otpResult.success) {
      await deleteTempUser(body.email);
      return ApiResponse.error(res, otpResult.message);
    }

    const contactMethod = contactInfo.email ? "email" : "phone";

    return ApiResponse.success(
      res,
      {
        ...body,
      },
      `Registration initiated. Please check your ${contactMethod} for OTP.`
    );
  } catch (err: any) {
    return ApiResponse.error(res, err.message);
  }
}

export async function register(req: Request, res: Response) {
  const rawBody = req.body || {};
  // Accept a single identifier in `email` which may be an email or phone
  const contactInfo = normalizeContact(rawBody.email);
  const bodyToValidate = { ...rawBody, ...contactInfo };

  const { error, value } = registerUserSchema.validate(bodyToValidate, {
    abortEarly: false,
  });
  if (error) {
    return ApiResponse.joiValidationError(res, error);
  }

  try {
    const body: RegisterInput = value;

    const isUserExist = await checkUserExists(body.email);
    if (isUserExist) {
      return ApiResponse.error(res, "User already exists");
    }

    // Store temp user
    await createTempUser(body);

    // Generate and send OTP
    const input = { email: body.email, phone: body.phone };
    const otpResult = await otpService.generateAndSendOtp(
      input,
      body.FirstName
    );

    if (!otpResult.success) {
      // Remove stored data if OTP generation fails
      await deleteTempUser(body.email);
      return ApiResponse.error(res, otpResult.message);
    }

    const contactMethod = body.email ? "email" : "phone";

    return ApiResponse.success(
      res,
      {
        ...body,
        phone: "",
        password: "",
      },
      `Registration initiated. Please check your ${contactMethod} for OTP.`
    );
  } catch (err: any) {
    return ApiResponse.error(res, err.message);
  }
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
    const { email, otp }: VerifyOtpInput = value;

    // Verify OTP - pass identifier (email or phone)
    const verifyResult = await otpService.verifyOtp(email, otp);

    if (!verifyResult.success) {
      return ApiResponse.error(res, verifyResult.message);
    }

    // Get stored registration data from temp user
    const registrationData = await getTempUser(email);

    if (!registrationData) {
      return ApiResponse.error(
        res,
        "Registration data not found. Please register again."
      );
    }

    // Delete temp user after successful registration
    await deleteTempUser(email);

    return ApiResponse.created(
      res,
      {
        verified: true,
      },
      "Registration completed successfully. You can now login."
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

    // Check if temp user exists
    const registrationData = await getTempUser(identifier);

    if (!registrationData) {
      return ApiResponse.error(
        res,
        "No pending registration found for this identifier. Please register again."
      );
    }

    // Prepare input for OTP service
    const input = {
      email: registrationData.email,
      phone: registrationData.phone,
    };

    // Resend OTP
    const resendResult = await otpService.resendEmailOtp(
      input,
      registrationData.FirstName
    );

    if (!resendResult.success) {
      return ApiResponse.error(res, resendResult.message);
    }

    const verificationType =
      registrationData.email === identifier ? "email" : "phone";

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
