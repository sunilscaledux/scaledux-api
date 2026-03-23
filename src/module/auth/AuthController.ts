import { Request, Response } from 'express';
import bcrypt from "bcrypt";
import { prisma } from "@services/prismaService";
import { generateTokenAndSetCookie, generateRefreshToken, getRefreshCookieOptions, baseCookieOptions } from "@utils/jwtUtils";
import {
  checkUserExists,
  userLogin,
  userOtpLogin,
  createUserAfterOtpVerification,
  createLoginDevice,
  rotateRefreshToken,
  getLoginDevices,
  revokeLoginDevice,
  revokeAllOtherDevices,
} from "./AuthService";
import { setProfileSectionsForRole } from "../profile/ProfileCompletionService";
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
import * as AuthService from "@module/auth/AuthService";
import { reactivateOnLogin } from "@module/profile/DeactivationService";
import { normalizeContact, generateKeycode } from '@utils/General';
import { Log } from '@services/loggerService';
import { NotificationService } from '@module/notification/NotificationService';
import { emailService } from '@services/emailService';

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
    const otpResult = await AuthService.generateAndSendOtp({
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
    const registrationData = await AuthService.getRegistrationData(identifier);
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

    // Generate access token
    const { token, cookieOptions, expiresIn } = generateTokenAndSetCookie(
      userResult.data,
      false,
      req
    );
    res.cookie("auth_token", token, cookieOptions);

    // Generate refresh token & store device
    const { token: refreshToken, expiresAt: rfExpiry } = generateRefreshToken(false);
    res.cookie("refresh_token", refreshToken, getRefreshCookieOptions(rfExpiry, req));
    await createLoginDevice(
      userResult.data.id,
      refreshToken,
      rfExpiry,
      req.ip,
      req.headers["user-agent"] as string
    );

    return ApiResponse.created(
      res,
      {
        user: {
          id: userResult.data.id,
          firstName: userResult.data.first_name,
          lastName: userResult.data.last_name,
          email: userResult.data.email,
          phone: userResult.data.phone,
          role: userResult.data.role,
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

    // Auto-reactivate if they were deactivated (login = become active again)
    await reactivateOnLogin(loginResult.data.id);

    const rememberMe = body.rememberMe || false;
    const { token, cookieOptions, expiresIn } = generateTokenAndSetCookie(
      loginResult.data,
      rememberMe,
      req
    );
    res.cookie("auth_token", token, cookieOptions);

    // Generate refresh token & store device
    const { token: refreshToken, expiresAt: rfExpiry } = generateRefreshToken(rememberMe);
    res.cookie("refresh_token", refreshToken, getRefreshCookieOptions(rfExpiry, req));
    await createLoginDevice(
      loginResult.data.id,
      refreshToken,
      rfExpiry,
      req.ip,
      req.headers["user-agent"] as string,
      rememberMe
    );

    return ApiResponse.success(
      res,
      {
        user: loginResult.data,
        token,
        authenticated: true,
        expiresIn: expiresIn,
        rememberMe,
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

    // Resend OTP using AuthService
    const resendResult = await AuthService.resendOtpByType({
      email: contactInfo.email || undefined,
      phone: contactInfo.phone || undefined,
    }, "REGISTRATION_VERIFICATION");

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
      case "forgot":
        if (!isUserExist) {
          return ApiResponse.error(
            res,
            `No account found with this ${contactMethod}. Please sign up first.`
          );
        }
        break;
    }

    // Generate and send OTP
    const otpResult = await AuthService.generateAndSendOtp({
      email: contactInfo.email || undefined,
      phone: contactInfo.phone || undefined,
      otpType: AuthService.OTP_TYPE_MAP[type],
    });

    if (!otpResult.success) {
      return ApiResponse.error(res, otpResult.message);
    }

    // Success messages based on type
    const successMessages = {
      registration: `Registration initiated. Please check your ${contactMethod} for OTP.`,
      login: `Login OTP sent successfully. Please check your ${contactMethod}.`,
      forgot: `Password reset OTP sent successfully. Please check your ${contactMethod}.`,
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
    Log.error("Error", { error });
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

    // Verify OTP using AuthService
    const response = await AuthService.verifyOtpByType(
      identifier,
      otp,
      AuthService.OTP_TYPE_MAP[type]
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

      case "login": {
        const loginResult = await userOtpLogin(identifier);
        if (!loginResult.success || !loginResult.data) {
          return ApiResponse.error(res, loginResult.message || "User not found");
        }

        // Auto-reactivate if they were deactivated (login = become active again)
        await reactivateOnLogin(loginResult.data.id);

        const { token, cookieOptions, expiresIn } = generateTokenAndSetCookie(
          loginResult.data,
          false,
          req
        );
        res.cookie("auth_token", token, cookieOptions);

        const { token: rfToken, expiresAt: rfExpiry } = generateRefreshToken(false);
        res.cookie("refresh_token", rfToken, getRefreshCookieOptions(rfExpiry, req));
        await createLoginDevice(
          loginResult.data.id,
          rfToken,
          rfExpiry,
          req.ip,
          req.headers["user-agent"] as string
        );

        responseData = {
          user: loginResult.data,
          token,
          authenticated: true,
          expiresIn,
        };
        responseData.message = "Login successful";
        break;
      }

      case "forgot":
        responseData.message =
          "Password reset OTP verified successfully. You can now reset your password.";
        break;
    }

    return ApiResponse.success(res, responseData, responseData.message);
  } catch (error: any) {
    Log.error("Error", { error });
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

    // Resend OTP using AuthService
    const resendResult = await AuthService.resendOtpByType(
      {
        email: contactInfo.email || undefined,
        phone: contactInfo.phone || undefined,
      },
      AuthService.OTP_TYPE_MAP[type]
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
    Log.error("Error", { error });
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
    Log.error("Error", { error });
    return ApiResponse.error(
      res,
      "Failed to reset password. Please try again."
    );
  }
}

export async function logout(req: Request, res: Response) {
  try {
    const clearOpts = baseCookieOptions(req);
    res.clearCookie("auth_token", clearOpts);

    const refreshToken = req.cookies?.refresh_token;
    if (refreshToken) {
      res.clearCookie("refresh_token", clearOpts);
      await prisma.loginDevice.updateMany({
        where: { refresh_token: refreshToken },
        data: { deleted_at: new Date() },
      });
    }

    return ApiResponse.success(
      res,
      { message: "Logged out successfully" },
      "You have been logged out successfully"
    );
  } catch (error: any) {
    Log.error("Error", { error });
    return ApiResponse.error(res, "Failed to logout. Please try again.");
  }
}

export async function refreshAccessToken(req: Request, res: Response) {
  try {
    const oldRefreshToken = req.cookies?.refresh_token;
    if (!oldRefreshToken) {
      return ApiResponse.unauthorized(res, "No refresh token provided");
    }

    const rememberMe = req.cookies?.auth_token
      ? (() => {
          try {
            const decoded: any = require("jsonwebtoken").decode(req.cookies.auth_token);
            return decoded?.rememberMe ?? false;
          } catch { return false; }
        })()
      : false;

    const result = await rotateRefreshToken(
      oldRefreshToken,
      rememberMe,
      req.ip,
      req.headers["user-agent"] as string
    );

    if (!result.success) {
      return ApiResponse.unauthorized(res, result.message);
    }

    const { user, newRefreshToken, expiresAt } = result.data;

    // Auto-reactivate if they were deactivated (login = become active again)
    await reactivateOnLogin(user.id);

    const { token, cookieOptions, expiresIn } = generateTokenAndSetCookie(user, rememberMe, req);

    res.cookie("auth_token", token, cookieOptions);
    res.cookie("refresh_token", newRefreshToken, getRefreshCookieOptions(expiresAt, req));

    return ApiResponse.success(res, { token, expiresIn }, "Token refreshed");
  } catch (error: any) {
    Log.error("Error", { error });
    return ApiResponse.unauthorized(res, "Invalid refresh token");
  }
}

export async function listLoginDevices(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return ApiResponse.unauthorized(res, "Authentication required");

    const currentRefreshToken = req.cookies?.refresh_token ?? "";
    const result = await getLoginDevices(userId, currentRefreshToken);
    return ApiResponse.success(res, result.data, result.message);
  } catch (error: any) {
    Log.error("Error", { error });
    return ApiResponse.error(res, "Failed to fetch devices");
  }
}

export async function logoutDevice(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return ApiResponse.unauthorized(res, "Authentication required");

    const deviceId = Number(req.params.deviceId);
    if (!deviceId) return ApiResponse.error(res, "Invalid device id", 400);

    const result = await revokeLoginDevice(userId, deviceId);
    if (!result.success) return ApiResponse.error(res, result.message, 404);

    const { emitSessionRevoked } = await import("./authSocket");
    await emitSessionRevoked(userId, deviceId);

    return ApiResponse.success(res, null, result.message);
  } catch (error: any) {
    Log.error("Error", { error });
    return ApiResponse.error(res, "Failed to logout device");
  }
}

export async function logoutAllOtherDevices(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return ApiResponse.unauthorized(res, "Authentication required");

    const currentRefreshToken = req.cookies?.refresh_token ?? "";
    const result = await revokeAllOtherDevices(userId, currentRefreshToken);
    if (result.deviceIds?.length) {
      const { emitSessionRevokedMany } = await import("./authSocket");
      await emitSessionRevokedMany(userId, result.deviceIds);
    }
    return ApiResponse.success(res, null, result.message);
  } catch (error: any) {
    Log.error("Error", { error });
    return ApiResponse.error(res, "Failed to logout other devices");
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
    Log.error("Error", { error });
    return ApiResponse.error(res, "Failed to test cookies");
  }
}

export async function updateUserRole(req: Request, res: Response) {
  const userId = req.user?.id;
  const { role } = req.body;

  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }

  if (!role) {
    return ApiResponse.error(res, "Role is required", 400);
  }

  // Validate role is one of the allowed values
  const allowedRoles = ['freelancer', 'founder', 'mentor', 'investor'];
  if (!allowedRoles.includes(role)) {
    return ApiResponse.error(res, "Invalid role. Must be one of: freelancer, founder, mentor, investor", 400);
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role }
    });

    await setProfileSectionsForRole(userId, role);
    await prisma.personalInfo.upsert({
      where: { user_id: userId },
      create: { user_id: userId, keycode: generateKeycode() },
      update: {},
    });

    NotificationService.create(userId, {
      type: 'WELCOME',
      title: 'Welcome to ScaleDux!',
      body: 'Your account is ready. Complete your profile to get the most out of ScaleDux.',
      link: '/my-profile',
    }).catch((e) => Log.error('Failed to create welcome notification', { error: e }));

    NotificationService.create(userId, {
      type: 'PROFILE_INCOMPLETE',
      title: 'Complete your profile',
      body: 'Profiles with complete information are 4.5x more likely to get noticed.',
      link: '/my-profile',
    }).catch((e) => Log.error('Failed to create profile notification', { error: e }));

 

    return ApiResponse.success(
      res,
      {
        role: updatedUser.role
      },
      "User role updated successfully"
    );
  } catch (error: any) {
    Log.error("Error", { error });
    return ApiResponse.error(res, "Failed to update user role");
  }
}
