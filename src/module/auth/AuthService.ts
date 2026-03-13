import { prisma } from "@services/prismaService";
import bcrypt from "bcrypt";
import { LoginInput, RegisterInput, UserDetail } from "./AuthTypes";
import { ServiceResponse } from "@utils/ApiResponse";
import { ulid } from "ulid";
import { emailService } from "../../services/emailService";
import { generateOtpCode, normalizeContact } from "@utils/General";
import mailConfig from "@config/mail";
import { generateRefreshToken } from "@utils/jwtUtils";
import { Log } from '@services/loggerService';

// ─── Device / refresh token helpers ─────────────────────────────────────────

function parseUserAgent(ua: string = ""): {
  browser: string;
  os: string;
  deviceType: string;
  deviceName: string;
} {
  let browser = "Unknown";
  let os = "Unknown";
  let deviceType = "web";

  if (/Chrome\//.test(ua) && !/Chromium|Edg|OPR/.test(ua)) browser = "Chrome";
  else if (/Firefox\//.test(ua)) browser = "Firefox";
  else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) browser = "Safari";
  else if (/Edg\//.test(ua)) browser = "Edge";
  else if (/OPR\/|Opera\//.test(ua)) browser = "Opera";

  if (/Windows/.test(ua)) os = "Windows";
  else if (/Macintosh|Mac OS X/.test(ua)) os = "macOS";
  else if (/Linux/.test(ua) && !/Android/.test(ua)) os = "Linux";
  else if (/Android/.test(ua)) { os = "Android"; deviceType = "mobile"; }
  else if (/iPhone|iPad/.test(ua)) { os = "iOS"; deviceType = "mobile"; }

  const deviceName = `${browser} on ${os}`;
  return { browser, os, deviceType, deviceName };
}

export async function createLoginDevice(
  userId: number,
  refreshToken: string,
  expiresAt: Date,
  ipAddress?: string,
  userAgent?: string,
  rememberMe?: boolean
): Promise<void> {
  const { browser, os, deviceType, deviceName } = parseUserAgent(userAgent);

  // Mark all previous non-deleted devices for this user as not current
  await prisma.loginDevice.updateMany({
    where: { user_id: userId, deleted_at: null },
    data: { is_current: false },
  });

  // Soft delete expired devices (keep rows for admin)
  const expired = await prisma.loginDevice.findMany({
    where: { user_id: userId, expires_at: { lt: new Date() }, deleted_at: null },
    select: { id: true },
  });
  if (expired.length > 0) {
    await prisma.loginDevice.updateMany({
      where: { id: { in: expired.map((d) => d.id) } },
      data: { deleted_at: new Date() },
    });
  }

  await prisma.loginDevice.create({
    data: {
      user_id: userId,
      refresh_token: refreshToken,
      device_name: deviceName,
      device_type: deviceType,
      browser,
      os,
      ip_address: ipAddress,
      is_current: true,
      last_used_at: new Date(),
      expires_at: expiresAt,
    },
  });
}

export async function rotateRefreshToken(
  oldToken: string,
  rememberMe: boolean,
  ipAddress?: string,
  userAgent?: string
): Promise<ServiceResponse> {
  const device = await prisma.loginDevice.findFirst({
    where: { refresh_token: oldToken, deleted_at: null },
    include: { user: true },
  });

  if (!device || device.expires_at < new Date()) {
    if (device) {
      await prisma.loginDevice.update({
        where: { id: device.id },
        data: { deleted_at: new Date() },
      });
    }
    return { success: false, message: "Invalid or expired refresh token" };
  }

  const { token: newRefreshToken, expiresAt } = generateRefreshToken(rememberMe);
  const { browser, os, deviceType, deviceName } = parseUserAgent(userAgent);

  await prisma.loginDevice.updateMany({
    where: { user_id: device.user_id, deleted_at: null },
    data: { is_current: false },
  });
  await prisma.loginDevice.update({
    where: { id: device.id },
    data: {
      refresh_token: newRefreshToken,
      expires_at: expiresAt,
      last_used_at: new Date(),
      ip_address: ipAddress ?? device.ip_address,
      browser,
      os,
      device_type: deviceType,
      device_name: deviceName,
      is_current: true,
    },
  });

  return {
    success: true,
    message: "Token rotated",
    data: { user: device.user, newRefreshToken, expiresAt },
  };
}

export async function getLoginDevices(
  userId: number,
  currentRefreshToken?: string
): Promise<ServiceResponse> {
  const devices = await prisma.loginDevice.findMany({
    where: { user_id: userId, expires_at: { gt: new Date() }, deleted_at: null },
    orderBy: { last_used_at: "desc" },
    select: {
      id: true,
      device_name: true,
      device_type: true,
      browser: true,
      os: true,
      ip_address: true,
      is_current: true,
      last_used_at: true,
      created_at: true,
      refresh_token: true,
    },
  });
  const token = currentRefreshToken?.trim();
  const list = devices.map((dev) => {
    const { refresh_token, ...rest } = dev;
    return {
      ...rest,
      is_current: token ? refresh_token === token : dev.is_current,
    };
  });
  return { success: true, message: "Devices fetched", data: list };
}

export async function revokeLoginDevice(
  userId: number,
  deviceId: number
): Promise<ServiceResponse> {
  const device = await prisma.loginDevice.findFirst({
    where: { id: deviceId, user_id: userId, deleted_at: null },
  });
  if (!device) {
    return { success: false, message: "Device not found" };
  }
  await prisma.loginDevice.update({
    where: { id: deviceId },
    data: { deleted_at: new Date() },
  });
  return { success: true, message: "Device logged out successfully" };
}

export async function revokeAllOtherDevices(
  userId: number,
  currentRefreshToken: string
): Promise<ServiceResponse & { deviceIds?: number[] }> {
  const toRevoke = await prisma.loginDevice.findMany({
    where: { user_id: userId, refresh_token: { not: currentRefreshToken }, deleted_at: null },
    select: { id: true },
  });
  const deviceIds = toRevoke.map((d) => d.id);
  await prisma.loginDevice.updateMany({
    where: { id: { in: deviceIds } },
    data: { deleted_at: new Date() },
  });
  return { success: true, message: "All other devices logged out", deviceIds };
}

/**
 * Revoke all devices for a user; returns their ids so caller can emit session_revoked_many (e.g. on deactivate).
 */
export async function revokeAllDevices(
  userId: number
): Promise<{ deviceIds: number[] }> {
  const devices = await prisma.loginDevice.findMany({
    where: { user_id: userId, deleted_at: null },
    select: { id: true },
  });
  const deviceIds = devices.map((d) => d.id);
  if (deviceIds.length > 0) {
    await prisma.loginDevice.updateMany({
      where: { id: { in: deviceIds } },
      data: { deleted_at: new Date() },
    });
  }
  return { deviceIds };
}

export async function checkUserExists(input: string): Promise<boolean> {
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        {
          phone: input,
        },
        {
          email: input,
        },
      ],
    },
  });

  return !!existingUser;
}

export async function createUserAfterOtpVerification(
  data: RegisterInput
): Promise<ServiceResponse> {
  try {
    // Double-check user doesn't exist
    const userExists = await checkUserExists(data.email);
    if (userExists) {
      return {
        success: false,
        message: "User already exists",
      };
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const contactInfo = normalizeContact(data.email);

    const userData: any = {
      first_name: data.first_name,
      unique_id: ulid(),
      last_name: data.last_name,
      email: contactInfo.email || data.email,
      phone: contactInfo.phone,
      password: hashedPassword,
      notification: data.notification || false,
      status: 1,
    };

    // Only include terms if provided (otherwise use database default)
    if (data.terms !== undefined) {
      userData.terms = data.terms;
    }

    // Set verification timestamp for the method that was used
    if (contactInfo.email || data.email) {
      userData.email_verified_at = new Date();
    }
    if (contactInfo.phone) {
      userData.phone_verified_at = new Date();
    }

    const user = await prisma.user.create({
      data: userData,
    });
    await prisma.personalInfo.create({
      data: { user_id: user.id },
    });
    const { password, ...safeUser } = user;
    return {
      success: true,
      message: "User created successfully",
      data: safeUser,
    };
  } catch (error: any) {
    Log.error("Error", { error });
    Log.error("Error details:", {
      message: error?.message,
      code: error?.code,
      meta: error?.meta
    });
    return {
      success: false,
      message: error?.message || "Failed to create user. Please try again.",
    };
  }
}

export async function userLogin(data: LoginInput): Promise<ServiceResponse> {
  try {
    const contactInfo = normalizeContact(data.email || "");

    const conditions = [];
    if (contactInfo.email) {
      conditions.push({ email: contactInfo.email });
    }
    if (contactInfo.phone) {
      conditions.push({ phone: contactInfo.phone });
    }

    if (conditions.length === 0) {
      return {
        success: false,
        message: "Email or phone number is required",
      };
    }

    // Find user by email or phone
    const user = await prisma.user.findFirst({
      where: { OR: conditions },
    });
    if (!user) {
      return {
        success: false,
        message: "Invalid credentials",
      };
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      data.password,
      user.password || ""
    );
    if (!isPasswordValid) {
      return {
        success: false,
        message: "Invalid credentials",
      };
    }

    // Check if the contact method used for login is verified
    if (contactInfo.email && !user.email_verified_at) {
      return {
        success: false,
        message: "Please verify your email before logging in",
      };
    }

    if (contactInfo.phone && !user.phone_verified_at) {
      return {
        success: false,
        message: "Please verify your phone number before logging in",
      };
    }

    // Return safe user data (without password)
    const { password: _, ...safeUser } = user;

    return {
      success: true,
      message: "Login successful",
      data: safeUser,
    };
  } catch (error) {
    Log.error("Error", { error });
    return {
      success: false,
      message: "Login failed. Please try again.",
    };
  }
}

export async function userOtpLogin(
  identifier: string
): Promise<ServiceResponse> {
  try {
    const contactInfo = normalizeContact(identifier);

    // Build conditions for finding user
    const conditions = [];
    if (contactInfo.email) {
      conditions.push({ email: contactInfo.email });
    }
    if (contactInfo.phone) {
      conditions.push({ phone: contactInfo.phone });
    }

    if (conditions.length === 0) {
      return {
        success: false,
        message: "Email or phone number is required",
      };
    }

    // Find user by email or phone
    const user = await prisma.user.findFirst({
      where: { OR: conditions },
    });

    if (!user) {
      return {
        success: false,
        message: "User not found",
      };
    }

    // Check if the contact method used for login is verified
    if (contactInfo.email && !user.email_verified_at) {
      return {
        success: false,
        message: "Please verify your email before logging in",
      };
    }

    if (contactInfo.phone && !user.phone_verified_at) {
      return {
        success: false,
        message: "Please verify your phone number before logging in",
      };
    }

    // Return safe user data (without password)
    const { password: _, ...safeUser } = user;

    return {
      success: true,
      message: "OTP login successful",
      data: safeUser,
    };
  } catch (error) {
    Log.error("Error", { error });
    return {
      success: false,
      message: "Login failed. Please try again.",
    };
  }
}


/**
 * Clean up expired OTPs for identifier and specific type
 */
async function cleanupExpiredOtps(
  identifier: string,
  otpType?: "REGISTRATION_VERIFICATION" | "LOGIN_VERIFICATION" | "FORGOT_PASSWORD_VERIFICATION"
): Promise<void> {
  try {
    const whereCondition: any = {
      OR: [{ email: identifier }, { phone: identifier }],
      expires_at: {
        lt: new Date(), // Expired
      },
    };

    // Add OTP type filter if specified
    if (otpType) {
      whereCondition.otp_type = otpType;
    }

    await prisma.otp.deleteMany({
      where: whereCondition,
    });
  } catch (error) {
    Log.error("Error", { error });
  }
}


/**
 * Send OTP via SMS (placeholder for future implementation)
 */
async function sendSmsOtp(phone: string, otpCode: string): Promise<boolean> {
  try {
    // TODO: Implement SMS service when available
    // return await smsService.sendOtpSms(phone, otpCode, firstName);
    Log.info(`SMS OTP ${otpCode} would be sent to ${phone}`);
    return true; // Temporary - assume success for phone
  } catch (error) {
    Log.error("Error", { error });
    return false;
  }
}

/**
 * Generate, store and send OTP
 */
export async function generateAndSendOtp(data: {
  email?: string | null;
  phone?: string | null;
  otpType: "REGISTRATION_VERIFICATION" | "LOGIN_VERIFICATION" | "FORGOT_PASSWORD_VERIFICATION";
  userId?: number;
}): Promise<ServiceResponse> {
  try {
    const identifier = data.email;

    if (!identifier) {
      return {
        success: false,
        message: "Email or phone number is required",
      };
    }

    // Clean up expired OTPs first
    await cleanupExpiredOtps(identifier, data.otpType);

    // Generate OTP code
    const otpCode = generateOtpCode();
    const expiresAt = new Date(Date.now() + mailConfig.OTP_VALIDITY_MINUTES * 60 * 1000); // 10 minutes

    // Save OTP to database
    const otp = await prisma.otp.create({
      data: {
        user_id: data.userId,
        email: data.email,
        phone: data.phone,
        otp_code: otpCode,
        otp_type: data.otpType,
        expires_at: expiresAt,
      },
    });

    // Send OTP based on type
    let sent = true;
    let message = "";

    if(data.otpType=='FORGOT_PASSWORD_VERIFICATION'){
     if (data.email) {
      sent = await emailService.sendPasswordResetEmail(data.email, otpCode);
      message = sent
        ? "OTP sent successfully to your email"
        : "Failed to send OTP email. Please try again.";
    } else if (data.phone) {
      sent = await sendSmsOtp(data.phone, otpCode);
      message = sent
        ? "OTP sent successfully to your phone"
        : "Failed to send OTP SMS. Please try again.";
    }
    }else{

      if (data.email) {
      sent = await emailService.sendOtpEmail(data.email, otpCode);
      message = sent
        ? "OTP sent successfully to your email"
        : "Failed to send OTP email. Please try again.";
    } else if (data.phone) {
      sent = await sendSmsOtp(data.phone, otpCode);
      message = sent
        ? "OTP sent successfully to your phone"
        : "Failed to send OTP SMS. Please try again.";
    }

    }


    if (!sent) {
      // Delete OTP if sending failed
      await prisma.otp.delete({ where: { id: otp.id } });
      return {
        success: false,
        message,
      };
    }

    return {
      success: true,
      message,
      data: {
        otpId: otp.id,
      },
    };
  } catch (error) {
    Log.error("Error", { error });
    return {
      success: false,
      message: "Failed to generate OTP. Please try again.",
    };
  }
}

/**
 * Generic method to verify OTP by type
 */
export async function verifyOtpByType(
  identifier: string,
  otpCode: string,
  otpType: "REGISTRATION_VERIFICATION" | "LOGIN_VERIFICATION" | "FORGOT_PASSWORD_VERIFICATION"
): Promise<ServiceResponse> {
  try {
    if (!identifier || !otpCode) {
      return {
        success: false,
        message: "Identifier and OTP are required",
      };
    }

    const contactInfo = normalizeContact(identifier);
    
    // Build where conditions for the specified OTP type
    const whereConditions: any = {
      otp_code: otpCode,
      verified: false,
      expires_at: {
        gt: new Date(), // Must not be expired
      },
      otp_type: otpType
    };

    // Add identifier conditions
    if (contactInfo.email) {
      whereConditions.email = contactInfo.email;
    } else if (contactInfo.phone) {
      whereConditions.phone = contactInfo.phone;
    } else {
      return {
        success: false,
        message: "Invalid email or phone format",
      };
    }

    // Find valid OTP
    const otp = await prisma.otp.findFirst({
      where: whereConditions,
      orderBy: {
        created_at: 'desc', // Get the most recent OTP
      },
    });

    if (!otp) {
      const typeMessages: Record<string, string> = {
        REGISTRATION_VERIFICATION: "Invalid or expired OTP",
        LOGIN_VERIFICATION: "Invalid or expired OTP",
        FORGOT_PASSWORD_VERIFICATION: "Invalid or expired OTP",
      };
      return {
        success: false,
        message: typeMessages[otpType],
      };
    }

    // Mark OTP as verified
    await prisma.otp.update({
      where: { id: otp.id },
      data: { verified: true },
    });

    // Invalidate other unverified OTPs of the same type for this identifier
    await prisma.otp.updateMany({
      where: {
        OR: [
          { email: contactInfo.email },
          { phone: contactInfo.phone }
        ].filter(Boolean),
        verified: false,
        otp_type: otpType,
        id: { not: otp.id },
      },
      data: { verified: true },
    });

    const verificationType = otp.email ? "Email" : "Phone";
    const successMessages: Record<string, string> = {
      "REGISTRATION_VERIFICATION": `${verificationType} verified successfully`,
      "LOGIN_VERIFICATION": `${verificationType} login OTP verified successfully`,
      "FORGOT_PASSWORD_VERIFICATION": `${verificationType} password reset OTP verified successfully`,
    };
    
    return {
      success: true,
      message: successMessages[otpType],
      data: otp,
    };
  } catch (error) {
    Log.error("Error", { error });
    return {
      success: false,
      message: "Failed to verify OTP. Please try again.",
    };
  }
}

/**
 * Generic method to resend OTP by type
 */
export async function resendOtpByType(
  data: {
    email?: string;
    phone?: string;
  },
  otpType: "REGISTRATION_VERIFICATION" | "LOGIN_VERIFICATION" | "FORGOT_PASSWORD_VERIFICATION"
): Promise<ServiceResponse> {
  try {
    const identifier = data.email || data.phone;

    if (!identifier) {
      return {
        success: false,
        message: "Email or phone number is required",
      };
    }

    // Invalidate existing unverified OTPs of the same type
    await prisma.otp.updateMany({
      where: {
        OR: [{ email: identifier }, { phone: identifier }],
        verified: false,
        otp_type: otpType,
      },
      data: { verified: true },
    });

    // Generate and send new OTP
    const result = await generateAndSendOtp({
      email: data.email,
      phone: data.phone,
      otpType: otpType,
    });

    return {
      success: result.success,
      message: result.message,
    };
  } catch (error) {
    Log.error("Error", { error });
    return {
      success: false,
      message: "Failed to resend OTP. Please try again.",
    };
  }
}

/**
 * Resend OTP (legacy method for backward compatibility - defaults to registration)
 */
export async function resendOtp(data: {
  email?: string;
  phone?: string;
}): Promise<ServiceResponse> {
  return resendOtpByType(data, "REGISTRATION_VERIFICATION");
}

/**
 * Get registration data from the most recent verified OTP for identifier
 */
export async function getRegistrationData(identifier: string): Promise<any | null> {
  try {
    const otp = await prisma.otp.findFirst({
      where: {
        OR: [{ email: identifier }, { phone: identifier }],
        verified: true,
        otp_type: "REGISTRATION_VERIFICATION",
        expires_at: {
          gt: new Date(), // Not expired
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });

    if (!otp) return null;

    // Return the contact info from the OTP record
    return {
      email: otp.email,
      phone: otp.phone,
      otpId: otp.id,
      verified: otp.verified,
    };
  } catch (error) {
    Log.error("Error", { error });
    return null;
  }
}
