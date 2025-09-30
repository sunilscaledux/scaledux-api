import { Request, Response } from 'express';
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../../config/prisma";
import {
  checkUserExists,
  userLogin,
  userOtpLogin,
  createUserAfterOtpVerification,
  normalizeContact,
} from "./userService";
import {
  RegisterInput,
  VerifyOtpInput,
  ResendOtpInput,
  LoginInput,
  UnifiedOtpRequest,
} from "./userTypes";
import {
  registerUserSchema,
  verifyOtpSchema,
  resendOtpSchema,
  loginUserSchema,
  unifiedOtpRequestSchema,
  unifiedVerifyOtpSchema,
  resetPasswordSchema,
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
    const contactMethod = contactInfo.email ? "email" : "phone";

    const isUserExist = await checkUserExists(body.identifier);

    if (isUserExist) {
      return ApiResponse.error(res, `This ${contactMethod} is already in use.`);
    }

    // Generate and send OTP with registration data
    const otpResult = await otpService.generateAndSendOtp({
      email: contactInfo.email || undefined,
      phone: contactInfo.phone || undefined,
      otpType: "REGISTRATION_VERIFICATION",
    });

    if (!otpResult.success) {
      return ApiResponse.error(res, otpResult.message);
    }

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
  const rawBody = req.body || {};
  const contactInfo = normalizeContact(rawBody.email);

  const { error, value } = registerUserSchema.validate(rawBody, {
    abortEarly: false,
  });
  if (error) {
    return ApiResponse.joiValidationError(res, error);
  }

  try {
    const identifier = contactInfo.email || contactInfo.phone;
    if (!identifier) {
      return ApiResponse.error(res, "Valid email or phone number is required");
    }

    // Check if user already exists
    const isUserExist = await checkUserExists(identifier);
    if (isUserExist) {
      const contactMethod = contactInfo.email ? "email" : "phone";
      return ApiResponse.error(res, `This ${contactMethod} is already in use.`);
    }

    // Check if OTP is verified for this identifier
    const registrationData = await otpService.getRegistrationData(identifier);
    if (!registrationData || !registrationData.verified) {
      return ApiResponse.error(
        res,
        "Please verify your email/phone number first before completing registration."
      );
    }

    const user = await createUserAfterOtpVerification(rawBody);

    // Generate JWT token for automatic login after registration
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        phone: user.phone 
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );

    // Set HTTP-only cookie for automatic login
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as "lax" | "strict" | "none",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: "/",
    };

    res.cookie("auth_token", token, cookieOptions);

    return ApiResponse.created(
      res,
      {
        user: {
          id: user.id,
          firstName: user.FirstName,
          lastName: user.LastName,
          email: user.email,
          phone: user.phone,
        },
        authenticated: true,
        expiresIn: "24h",
      },
      "Registration completed successfully. You are now logged in."
    );
  } catch (err: any) {
    return ApiResponse.error(res, err.message);
  }
}

export async function login(req: Request, res: Response) {
  const rawBody = req.body || {};

  const { error, value } = loginUserSchema.validate(rawBody, {
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

    // Set HTTP-only cookie for authentication
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // HTTPS only in production
      sameSite: (process.env.NODE_ENV === "production" ? "lax" : "lax") as "lax" | "strict" | "none",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
      path: "/"
    };

    res.cookie("auth_token", loginResult.token, cookieOptions);

    // Debug: Log cookie setting
    console.log("Setting cookie with options:", cookieOptions);
    console.log("Token length:", loginResult.token?.length);

    return ApiResponse.success(
      res,
      {
        user: loginResult.user,
        authenticated: true,
        expiresIn: "24h",
        debug: {
          cookieSet: true,
          tokenLength: loginResult.token?.length
        }
      },
      "Login successful"
    );
  } catch (err: any) {
    return ApiResponse.error(res, err.message);
  }
}

export async function checkUserExistsForLogin(req: Request, res: Response) {
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
    const contactMethod = contactInfo.email ? "email" : "phone";

    const isUserExist = await checkUserExists(body.identifier);

    if (!isUserExist) {
      return ApiResponse.error(
        res,
        `No account found with this ${contactMethod}. Please sign up first.`
      );
    }

    return ApiResponse.success(
      res,
      {
        identifier: body.identifier,
        exists: true,
      },
      `User found. Please enter your password.`
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

export async function requestLoginOtp(req: Request, res: Response) {
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
    const contactMethod = contactInfo.email ? "email" : "phone";

    // Check if user exists
    const isUserExist = await checkUserExists(body.identifier);
    if (!isUserExist) {
      return ApiResponse.error(
        res,
        `No account found with this ${contactMethod}. Please sign up first.`
      );
    }

    // Generate and send OTP for login
    const otpResult = await otpService.generateAndSendOtp({
      email: contactInfo.email || undefined,
      phone: contactInfo.phone || undefined,
      otpType: "LOGIN_VERIFICATION",
    });

    if (!otpResult.success) {
      return ApiResponse.error(res, otpResult.message);
    }

    return ApiResponse.success(
      res,
      {
        identifier: body.identifier,
        expiresIn: 600, // 10 minutes
      },
      `Login OTP sent successfully. Please check your ${contactMethod}.`
    );
  } catch (err: any) {
    return ApiResponse.error(res, err.message);
  }
}

export async function verifyLoginOtp(req: Request, res: Response) {
  const bodyToValidate = req.body || {};

  const { error, value } = verifyOtpSchema.validate(bodyToValidate, {
    abortEarly: false,
  });

  if (error) {
    return ApiResponse.joiValidationError(res, error);
  }

  try {
    const { identifier, otp }: VerifyOtpInput = value;

    // Verify OTP using otpService for login
    const response = await otpService.verifyOtpByType(
      identifier,
      otp,
      "LOGIN_VERIFICATION"
    );

    if (!response.success) {
      return ApiResponse.error(res, response.message);
    }

    // Perform OTP login to get user and token
    const loginResult = await userOtpLogin(identifier);
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

export async function requestForgotPasswordOtp(req: Request, res: Response) {
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
    const contactMethod = contactInfo.email ? "email" : "phone";

    // Check if user exists
    const isUserExist = await checkUserExists(body.identifier);
    if (!isUserExist) {
      return ApiResponse.error(
        res,
        `No account found with this ${contactMethod}. Please sign up first.`
      );
    }

    // Generate and send OTP for forgot password
    const otpResult = await otpService.generateAndSendOtp({
      email: contactInfo.email || undefined,
      phone: contactInfo.phone || undefined,
      otpType: "FORGOT_PASSWORD_VERIFICATION",
    });

    if (!otpResult.success) {
      return ApiResponse.error(res, otpResult.message);
    }

    return ApiResponse.success(
      res,
      {
        identifier: body.identifier,
        expiresIn: 600, // 10 minutes
      },
      `Password reset OTP sent successfully. Please check your ${contactMethod}.`
    );
  } catch (err: any) {
    return ApiResponse.error(res, err.message);
  }
}

export async function verifyForgotPasswordOtp(req: Request, res: Response) {
  const bodyToValidate = req.body || {};

  const { error, value } = verifyOtpSchema.validate(bodyToValidate, {
    abortEarly: false,
  });

  if (error) {
    return ApiResponse.joiValidationError(res, error);
  }

  try {
    const { identifier, otp }: VerifyOtpInput = value;

    // Verify OTP using otpService for forgot password
    const response = await otpService.verifyOtpByType(
      identifier,
      otp,
      "FORGOT_PASSWORD_VERIFICATION"
    );

    if (!response.success) {
      return ApiResponse.error(res, response.message);
    }

    return ApiResponse.success(
      res,
      {
        identifier: identifier,
        verified: true,
      },
      "Password reset OTP verified successfully. You can now reset your password."
    );
  } catch (err: any) {
    return ApiResponse.error(res, err.message);
  }
}

interface UnifiedVerifyOtpRequest extends UnifiedOtpRequest {
  otp: string;
}

export async function requestOtp(req: Request, res: Response) {
  // Validate request body
  const { error, value } = unifiedOtpRequestSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error) {
    return ApiResponse.joiValidationError(res, error);
  }

  try {
    const { identifier, type }: UnifiedOtpRequest = value;

    const contactInfo = normalizeContact(identifier);
    const contactMethod = contactInfo.email ? "email" : "phone";

    if (!contactInfo.email && !contactInfo.phone) {
      return ApiResponse.error(res, "Invalid email or phone format");
    }

    // Check user existence based on type
    const isUserExist = await checkUserExists(identifier);

    switch (type) {
      case "registration":
        if (isUserExist) {
          return ApiResponse.error(
            res,
            `This ${contactMethod} is already in use.`
          );
        }
        break;

      case "login":
      case "forgot-password":
        if (!isUserExist) {
          return ApiResponse.error(
            res,
            `No account found with this ${contactMethod}. Please sign up first.`
          );
        }
        break;
    }

    // Map frontend types to backend OTP types
    const otpTypeMap = {
      registration: "REGISTRATION_VERIFICATION" as const,
      login: "LOGIN_VERIFICATION" as const,
      "forgot-password": "FORGOT_PASSWORD_VERIFICATION" as const,
    };

    // Generate and send OTP
    const otpResult = await otpService.generateAndSendOtp({
      email: contactInfo.email || undefined,
      phone: contactInfo.phone || undefined,
      otpType: otpTypeMap[type],
    });

    if (!otpResult.success) {
      return ApiResponse.error(res, otpResult.message);
    }

    // Success messages based on type
    const successMessages = {
      registration: `Registration initiated. Please check your ${contactMethod} for OTP.`,
      login: `Login OTP sent successfully. Please check your ${contactMethod}.`,
      "forgot-password": `Password reset OTP sent successfully. Please check your ${contactMethod}.`,
    };

    return ApiResponse.success(
      res,
      {
        identifier,
        expiresIn: 600, // 10 minutes in seconds
      },
      successMessages[type]
    );
  } catch (error: any) {
    console.error("Request OTP Error:", error);
    return ApiResponse.error(res, "Failed to send OTP. Please try again.");
  }
}

export async function verifyOtp(req: Request, res: Response) {
  const { error, value } = unifiedVerifyOtpSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error) {
    return ApiResponse.joiValidationError(res, error);
  }

  try {
    const { identifier, otp, type }: UnifiedVerifyOtpRequest = value;

    // Map frontend types to backend OTP types
    const otpTypeMap = {
      registration: "REGISTRATION_VERIFICATION" as const,
      login: "LOGIN_VERIFICATION" as const,
      "forgot-password": "FORGOT_PASSWORD_VERIFICATION" as const,
    };

    // Verify OTP using otpService
    const response = await otpService.verifyOtpByType(
      identifier,
      otp,
      otpTypeMap[type]
    );

    if (!response.success) {
      return ApiResponse.error(res, response.message);
    }

    // Handle different verification types
    let responseData: any = {
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
        const loginResult = await userOtpLogin(identifier);
        if (!loginResult.success) {
          return ApiResponse.error(res, loginResult.message);
        }

        // Set HTTP-only cookie for OTP login
        const cookieOptions = {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax" as "lax" | "strict" | "none",
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
          path: "/",
        };

        res.cookie("auth_token", loginResult.token, cookieOptions);

        responseData = {
          user: loginResult.user,
          authenticated: true,
          expiresIn: "24h",
        };
        responseData.message = "Login successful";
        break;

      case "forgot-password":
        responseData.message =
          "Password reset OTP verified successfully. You can now reset your password.";
        break;
    }

    return ApiResponse.success(res, responseData, responseData.message);
  } catch (error: any) {
    console.error("Verify OTP Error:", error);
    return ApiResponse.error(res, "Failed to verify OTP. Please try again.");
  }
}

export async function resendOtpUnified(req: Request, res: Response) {
  const { error, value } = unifiedOtpRequestSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error) {
    return ApiResponse.joiValidationError(res, error);
  }

  try {
    const { identifier, type }: UnifiedOtpRequest = value;

    const contactInfo = normalizeContact(identifier);
    const contactMethod = contactInfo.email ? "email" : "phone";

    if (!contactInfo.email && !contactInfo.phone) {
      return ApiResponse.error(res, "Invalid email or phone format");
    }

    // Map frontend types to backend OTP types
    const otpTypeMap = {
      registration: "REGISTRATION_VERIFICATION" as const,
      login: "LOGIN_VERIFICATION" as const,
      "forgot-password": "FORGOT_PASSWORD_VERIFICATION" as const,
    };

    // Resend OTP using otpService
    const resendResult = await otpService.resendOtpByType(
      {
        email: contactInfo.email || undefined,
        phone: contactInfo.phone || undefined,
      },
      otpTypeMap[type]
    );

    if (!resendResult.success) {
      return ApiResponse.error(res, resendResult.message);
    }

    return ApiResponse.success(
      res,
      {
        identifier,
        expiresIn: 600, // 10 minutes
      },
      `OTP resent successfully. Please check your ${contactMethod}.`
    );
  } catch (error: any) {
    console.error("Resend OTP Error:", error);
    return ApiResponse.error(res, "Failed to resend OTP. Please try again.");
  }
}

export async function resetPassword(req: Request, res: Response) {
  // Validate request body
  const { error, value } = resetPasswordSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error) {
    return ApiResponse.joiValidationError(res, error);
  }

  try {
    const { identifier, password } = value;

    const contactInfo = normalizeContact(identifier);

    // Check if user exists
    const isUserExist = await checkUserExists(identifier);
    if (!isUserExist) {
      const contactMethod = contactInfo.email ? "email" : "phone";
      return ApiResponse.error(
        res,
        `No account found with this ${contactMethod}.`
      );
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update user password in database
    const updatedUser = await prisma.user.updateMany({
      where: {
        OR: [{ email: contactInfo.email }, { phone: contactInfo.phone }].filter(
          Boolean
        ),
      },
      data: {
        password: hashedPassword,
        updated_at: new Date(),
      },
    });

    if (updatedUser.count === 0) {
      return ApiResponse.error(
        res,
        "Failed to update password. User not found."
      );
    }

    // Invalidate all existing OTPs for this user
    await prisma.otp.updateMany({
      where: {
        OR: [{ email: contactInfo.email }, { phone: contactInfo.phone }].filter(
          Boolean
        ),
        verified: false,
      },
      data: { verified: true },
    });

    return ApiResponse.success(
      res,
      { message: "Password reset successful" },
      "Your password has been reset successfully. You can now login with your new password."
    );
  } catch (error: any) {
    console.error("Reset Password Error:", error);
    return ApiResponse.error(
      res,
      "Failed to reset password. Please try again."
    );
  }
}

export async function logout(req: Request, res: Response) {
  try {
    // Clear the authentication cookie
    res.clearCookie("auth_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as "lax" | "strict" | "none",
      path: "/",
    });

    return ApiResponse.success(
      res,
      { message: "Logged out successfully" },
      "You have been logged out successfully"
    );
  } catch (error: any) {
    console.error("Logout Error:", error);
    return ApiResponse.error(res, "Failed to logout. Please try again.");
  }
}

export async function testCookies(req: Request, res: Response) {
  try {
    // Set a test cookie
    res.cookie("test_cookie", "test_value", {
      httpOnly: false, // Make it visible in browser for testing
      secure: false,
      sameSite: "lax" as "lax" | "strict" | "none",
      maxAge: 60 * 1000, // 1 minute
      path: "/"
    });

    return ApiResponse.success(
      res,
      {
        message: "Test cookie set",
        receivedCookies: req.cookies,
        headers: req.headers
      },
      "Cookie test successful"
    );
  } catch (error: any) {
    console.error("Test Cookies Error:", error);
    return ApiResponse.error(res, "Failed to test cookies");
  }
}

export async function getCurrentUser(req: Request, res: Response) {
  try {
    // Debug: Log cookies received
    console.log("Cookies received:", req.cookies);
    console.log("Auth token from cookie:", req.cookies?.auth_token);
    
    // User is already attached to req by authenticateToken middleware
    const user = req.user;

    if (!user) {
      return ApiResponse.unauthorized(res, "Not authenticated");
    }

    // Get full user details from database
    const userDetails = await prisma.user.findUnique({
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
      return ApiResponse.error(res, "User not found");
    }

    return ApiResponse.success(
      res,
      {
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
      },
      "User details retrieved successfully"
    );
  } catch (error: any) {
    console.error("Get Current User Error:", error);
    return ApiResponse.error(res, "Failed to get user details");
  }
}
