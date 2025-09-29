import { emailService } from "../../services/emailService";
import { prisma } from "../../config/prisma";
import { normalizeContact } from "./userService";

export class OtpService {
  /**
   * Generate a random OTP code
   */
  private generateOtpCode(length: number = 6): string {
    const digits = "0123456789";
    let otp = "";

    for (let i = 0; i < length; i++) {
      otp += digits[Math.floor(Math.random() * digits.length)];
    }

    return otp;
  }

  /**
   * Clean up expired OTPs for identifier
   */
  private async cleanupExpiredOtps(identifier: string): Promise<void> {
    try {
      await prisma.otp.deleteMany({
        where: {
          OR: [{ email: identifier }, { phone: identifier }],
          expires_at: {
            lt: new Date(), // Expired
          },
        },
      });
    } catch (error) {
      console.error("Error cleaning up expired OTPs:", error);
    }
  }

  /**
   * Generate, store and send OTP
   */
  async generateAndSendOtp(data: {
    email?: string | null;
    phone?: string | null;
    otpType:
      | "EMAIL_VERIFICATION"
      | "PHONE_VERIFICATION"
      | "PASSWORD_RESET"
      | "LOGIN_VERIFICATION";
    firstName?: string;
    userId?: number;
  }): Promise<{ success: boolean; message: string; otpId?: number }> {
    try {
      const identifier = data.email || data.phone;

      if (!identifier) {
        return {
          success: false,
          message: "Email or phone number is required",
        };
      }

      // Clean up expired OTPs first
      await this.cleanupExpiredOtps(identifier);

      // Generate OTP code
      const otpCode = this.generateOtpCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

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
      let sent = false;
      let message = "";

      if (data.email) {
        sent = await this.sendEmailOtp(data.email, otpCode, data.firstName);
        message = sent
          ? "OTP sent successfully to your email"
          : "Failed to send OTP email. Please try again.";
      } else if (data.phone) {
        sent = await this.sendSmsOtp(data.phone, otpCode, data.firstName);
        message = sent
          ? "OTP sent successfully to your phone"
          : "Failed to send OTP SMS. Please try again.";
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
        otpId: otp.id,
      };
    } catch (error) {
      console.error("Error generating and sending OTP:", error);
      return {
        success: false,
        message: "Failed to generate OTP. Please try again.",
      };
    }
  }

  /**
   * Verify OTP
   */
  async verifyOtp(
    identifier: string,
    otpCode: string
  ): Promise<{ success: boolean; message: string; otpId?: number }> {
    try {
      if (!identifier || !otpCode) {
        return {
          success: false,
          message: "Identifier and OTP are required",
        };
      }

      // Find valid OTP
      const otp = await prisma.otp.findFirst({
        where: {
          OR: [{ email: identifier }, { phone: identifier }],
          otp_code: otpCode,
          verified: false,
          expires_at: {
            gt: new Date(), // Not expired
          },
        },
      });

      if (!otp) {
        console.warn(
          `Failed OTP verification attempt for identifier: ${identifier}`
        );
        return {
          success: false,
          message: "Invalid or expired OTP",
        };
      }

      // Mark OTP as verified
      await prisma.otp.update({
        where: { id: otp.id },
        data: { verified: true },
      });

      // Invalidate other unverified OTPs for this identifier
      await prisma.otp.updateMany({
        where: {
          OR: [{ email: identifier }, { phone: identifier }],
          verified: false,
          id: { not: otp.id },
        },
        data: { verified: true },
      });

      //mark temp user verified
      const input = normalizeContact(identifier);
      const inputToVerified = input.email
        ? { email_verified_at: new Date() }
        : { phone_verified_at: new Date() };
      await prisma.tempUser.updateMany({
        where: {
          OR: [{ email: identifier }, { phone: identifier }],
        },
        data: inputToVerified,
      });

      const verificationType = otp.email ? "Email" : "Phone";
      return {
        success: true,
        message: `${verificationType} verified successfully`,
        otpId: otp.id,
      };
    } catch (error) {
      console.error("Error verifying OTP:", error);
      return {
        success: false,
        message: "Failed to verify OTP. Please try again.",
      };
    }
  }

  /**
   * Resend OTP
   */
  async resendOtp(data: {
    email?: string;
    phone?: string;
    firstName?: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const identifier = data.email || data.phone;

      if (!identifier) {
        return {
          success: false,
          message: "Email or phone number is required",
        };
      }

      // Invalidate existing unverified OTPs
      await prisma.otp.updateMany({
        where: {
          OR: [{ email: identifier }, { phone: identifier }],
          verified: false,
        },
        data: { verified: true },
      });

      // Generate and send new OTP
      const otpType = data.email ? "EMAIL_VERIFICATION" : "PHONE_VERIFICATION";
      const result = await this.generateAndSendOtp({
        email: data.email,
        phone: data.phone,
        otpType,
        firstName: data.firstName,
      });

      return {
        success: result.success,
        message: result.message,
      };
    } catch (error) {
      console.error("Error resending OTP:", error);
      return {
        success: false,
        message: "Failed to resend OTP. Please try again.",
      };
    }
  }

  /**
   * Send OTP via email
   */
  private async sendEmailOtp(
    email: string,
    otpCode: string,
    firstName?: string
  ): Promise<boolean> {
    try {
      return await emailService.sendOtpEmail(email, otpCode, firstName);
    } catch (error) {
      console.error("Error sending email OTP:", error);
      return false;
    }
  }

  /**
   * Send OTP via SMS (placeholder for future implementation)
   */
  private async sendSmsOtp(
    phone: string,
    otpCode: string,
    firstName?: string
  ): Promise<boolean> {
    try {
      // TODO: Implement SMS service when available
      // return await smsService.sendOtpSms(phone, otpCode, firstName);
      console.log(
        `SMS OTP ${otpCode} would be sent to ${phone} for ${firstName}`
      );
      return true; // Temporary - assume success for phone
    } catch (error) {
      console.error("Error sending SMS OTP:", error);
      return false;
    }
  }
}

export const otpService = new OtpService();
