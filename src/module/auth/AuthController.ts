import { Request, Response } from 'express';
import bcrypt from "bcrypt";
import { prisma } from "../../config/prisma";
import { generateTokenAndSetCookie } from "@utils/jwtUtils";
import {
  checkUserExists,
  userLogin,
  userOtpLogin,
  createUserAfterOtpVerification,
  normalizeContact,
} from "./AuthService";
import {
  RegisterInput,
  VerifyOtpInput,
  ResendOtpInput,
  LoginInput,
  UnifiedOtpRequest,
} from "./AuthTypes";
import {
  registerUserSchema,
  verifyOtpSchema,
  resendOtpSchema,
  loginUserSchema,
  unifiedOtpRequestSchema,
  unifiedVerifyOtpSchema,
  resetPasswordSchema,
} from "./AuthValidation";
import { ApiResponse } from "@utils/ApiResponse";
import { otpService } from "@module/auth/otpService";
import { getFileUrl } from '@utils/General';

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

    const userResult = await createUserAfterOtpVerification(rawBody);
    if (!userResult.success) {
      return ApiResponse.error(res, userResult.message);
    }

    // Generate token, set cookie, and get token for response
    const { token, cookieOptions, expiresIn } = generateTokenAndSetCookie(
      userResult.data,
      false
    );
    res.cookie("auth_token", token, cookieOptions);

    return ApiResponse.created(
      res,
      {
        user: {
          id: userResult.data.id,
          firstName: userResult.data.FirstName,
          lastName: userResult.data.LastName,
          email: userResult.data.email,
          phone: userResult.data.phone,
        },
        token,
        authenticated: true,
        expiresIn: expiresIn,
      },
      userResult.message
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

    // Generate token and cookie options with rememberMe
    const { token, cookieOptions, expiresIn } = generateTokenAndSetCookie(
      loginResult.data,
      body.rememberMe || false
    );
    res.cookie("auth_token", token, cookieOptions);

    return ApiResponse.success(
      res,
      {
        user: loginResult.data,
        token,
        authenticated: true,
        expiresIn: expiresIn,
        rememberMe: body.rememberMe || false,
      },
      loginResult.message
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
        if (!loginResult.success || !loginResult.data) {
          return ApiResponse.error(
            res,
            loginResult.message || "User not found"
          );
        }

        const { token, cookieOptions, expiresIn } = generateTokenAndSetCookie(
          loginResult.data,
          false
        );
        res.cookie("auth_token", token, cookieOptions);

        responseData = {
          user: loginResult.data,
          token,
          authenticated: true,
          expiresIn: expiresIn,
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
      sameSite: "none",
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
      sameSite: "none",
      maxAge: 60 * 1000, // 1 minute
      path: "/",
    });

    return ApiResponse.success(
      res,
      {
        message: "Test cookie set",
        receivedCookies: req.cookies,
        headers: req.headers,
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
    // User is already attached to req by authenticateToken middleware
    const user = req.user;

    if (!user) {
      return ApiResponse.unauthorized(res, "Not authenticated");
    }

    // Get full user details from database with relations
    const userDetails = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        personalInfo: {
          include: {
            currency: {
              select: {
                id: true,
                name: true,
                code: true,
                symbol: true
              }
            },
            country: {
              select: {
                id: true,
                name: true,
                code: true,
                flag: true
              }
            },
            state: {
              select: {
                id: true,
                name: true,
                code: true
              }
            }
          }
        }
      }
    });

    if (!userDetails) {
      return ApiResponse.error(res, "User not found");
    }

    return ApiResponse.success(
      res,
      {
        id: userDetails.id,
        uniqueId: userDetails.uniqueId,
        firstName: userDetails.FirstName,
        lastName: userDetails.LastName,
        email: userDetails.email,
        coverImage: getFileUrl(userDetails.coverImage),
        profileImage: getFileUrl(userDetails.profileImage),
        phone: userDetails.phone,
        emailVerified: !!userDetails.email_verified_at,
        phoneVerified: !!userDetails.phone_verified_at,
        status: userDetails.status,
        // Get personal info data from personalInfo relation
        title: userDetails.personalInfo?.title || null,
        about: userDetails.personalInfo?.about || null,
        address: userDetails.personalInfo?.address || null,
        address_line_2: userDetails.personalInfo?.address_line_2 || null,
        zipCode: userDetails.personalInfo?.zipCode || null,
        // Send relation data with proper structure from personalInfo
        country: userDetails.personalInfo?.country
          ? {
              id: userDetails.personalInfo.country.id,
              name: userDetails.personalInfo.country.name,
              code: userDetails.personalInfo.country.code,
              flag: userDetails.personalInfo.country.flag
                ? getFileUrl(userDetails.personalInfo.country.flag)
                : null,
            }
          : null,
        state: userDetails.personalInfo?.state
          ? {
              id: userDetails.personalInfo.state.id,
              name: userDetails.personalInfo.state.name,
              code: userDetails.personalInfo.state.code,
            }
          : null,
        city: userDetails.personalInfo?.city || null,
        website: userDetails.personalInfo?.website || null,
        hideEmail: userDetails.hideEmail,
        hidePhone: userDetails.hidePhone,
        links: userDetails.personalInfo?.links || null,
        languages: userDetails.personalInfo?.languages || null,
        currency: userDetails.personalInfo?.currency
          ? {
              id: userDetails.personalInfo.currency.id,
              name: userDetails.personalInfo.currency.name,
              code: userDetails.personalInfo.currency.code,
              symbol: userDetails.personalInfo.currency.symbol,
            }
          : null,
        hourly_rate: userDetails.personalInfo?.hourly_rate || null,
      },

      "User details retrieved successfully"
    );
  } catch (error: any) {
    console.error("Get Current User Error:", error);
    return ApiResponse.error(res, "Failed to get user details");
  }
}
