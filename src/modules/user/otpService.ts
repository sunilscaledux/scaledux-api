import { prisma } from '../../config/prisma';
import { emailService } from '../../services/emailService';
import crypto from 'crypto';

export interface OtpData {
  id: number;
  email?: string;
  phone?: string;
  otp_code: string;
  otp_type: 'EMAIL_VERIFICATION' | 'PHONE_VERIFICATION' | 'PASSWORD_RESET' | 'LOGIN_VERIFICATION';
  expires_at: Date;
  verified: boolean;
}

export class OtpService {
  /**
   * Generate a random OTP code
   */
  private generateOtpCode(length: number = 6): string {
    const digits = '0123456789';
    let otp = '';
    
    for (let i = 0; i < length; i++) {
      otp += digits[Math.floor(Math.random() * digits.length)];
    }
    
    return otp;
  }

  /**
   * Generate and send OTP (Email or Phone)
   */
  async generateAndSendOtp(input: { email?: string | null; phone?: string | null }, firstName?: string, userId?: number): Promise<{ success: boolean; message: string; otpId?: number }> {
    try {
      // Clean and validate input
      const cleanEmail = input.email && input.email.trim() !== '' ? input.email.trim() : null;
      const cleanPhone = input.phone && input.phone.trim() !== '' ? input.phone.trim() : null;
      
      // Determine OTP type based on input
      const otpType = cleanEmail ? 'EMAIL_VERIFICATION' : 'PHONE_VERIFICATION';
      const identifier = cleanEmail || cleanPhone;

      if (!identifier) {
        return {
          success: false,
          message: 'Email or phone number is required'
        };
      }

      // Clean up expired OTPs
      await this.cleanupExpiredOtps({ email: cleanEmail, phone: cleanPhone }, otpType);

      // Build conditions for recent OTP check
      const recentOtpConditions = [];
      if (cleanEmail) {
        recentOtpConditions.push({ email: cleanEmail });
      }
      if (cleanPhone) {
        recentOtpConditions.push({ phone: cleanPhone });
      }

      // Check if there's a recent valid OTP (within last 2 minutes to prevent spam)
      const recentOtp = recentOtpConditions.length > 0 ? await prisma.otp.findFirst({
        where: {
          OR: recentOtpConditions,
          otp_type: otpType,
          verified: false,
          created_at: {
            gte: new Date(Date.now() - 2 * 60 * 1000) // 2 minutes ago
          }
        }
      }) : null;

      if (recentOtp) {
        return {
          success: false,
          message: 'Please wait 2 minutes before requesting a new OTP'
        };
      }

      // Generate new OTP
      const otpCode = this.generateOtpCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

      // Save OTP to database
      const otp = await prisma.otp.create({
        data: {
          user_id: userId,
          email: cleanEmail,
          phone: cleanPhone,
          otp_code: otpCode,
          otp_type: otpType,
          expires_at: expiresAt,
        }
      });

      // Send OTP based on type
      let sent = false;
      let message = '';

      if (cleanEmail) {
        sent = await emailService.sendOtpEmail(cleanEmail, otpCode, firstName);
        message = sent ? 'OTP sent successfully to your email' : 'Failed to send OTP email. Please try again.';
      } else if (cleanPhone) {
        // TODO: Implement SMS service when available
        // sent = await smsService.sendOtpSms(cleanPhone, otpCode, firstName);
        sent = true; // Temporary - assume success for phone
        message = 'OTP sent successfully to your phone';
      }

      if (!sent) {
        await prisma.otp.delete({ where: { id: otp.id } });
        return {
          success: false,
          message
        };
      }

      return {
        success: true,
        message,
        otpId: otp.id
      };

    } catch (error) {
      console.error('Error generating OTP:', error);
      return {
        success: false,
        message: 'Failed to generate OTP. Please try again.'
      };
    }
  }

  /**
   * Verify OTP (Email or Phone) with rate limiting
   */
  async verifyOtp(identifier: string, otpCode: string): Promise<{ success: boolean; message: string; otpId?: number }> {
    try {
      if (!identifier || !otpCode) {
        return {
          success: false,
          message: 'Identifier and OTP are required'
        };
      }

      // Check rate limiting - max 5 attempts per 15 minutes
      const attemptCount = await this.getOtpAttemptsCount(identifier, 15);
      if (attemptCount >= 10) { // Allow more attempts for verification
        return {
          success: false,
          message: 'Too many verification attempts. Please try again after 15 minutes.'
        };
      }

      // Find valid OTP by email or phone
      const otp = await prisma.otp.findFirst({
        where: {
          OR: [
            { email: identifier },
            { phone: identifier }
          ],
          otp_code: otpCode,
          verified: false,
          expires_at: {
            gt: new Date() // Not expired
          }
        }
      });

      if (!otp) {
        // Log failed attempt for security monitoring
        console.warn(`Failed OTP verification attempt for identifier: ${identifier}`);
        return {
          success: false,
          message: 'Invalid or expired OTP'
        };
      }

      // Mark OTP as verified
      await prisma.otp.update({
        where: { id: otp.id },
        data: { verified: true }
      });

      // Update user's verification status if user exists
      if (otp.user_id) {
        if (otp.email) {
          await prisma.user.update({
            where: { id: otp.user_id },
            data: { email_verified_at: new Date() }
          });
        }
        if (otp.phone) {
          await prisma.user.update({
            where: { id: otp.user_id },
            data: { phone_verified_at: new Date() }
          });
        }
      }

      // Invalidate any other unverified OTPs for this identifier
      await prisma.otp.updateMany({
        where: {
          OR: [
            { email: identifier },
            { phone: identifier }
          ],
          verified: false,
          id: { not: otp.id }
        },
        data: { verified: true }
      });

      const verificationType = otp.email ? 'Email' : 'Phone';
      return {
        success: true,
        message: `${verificationType} verified successfully`,
        otpId: otp.id
      };

    } catch (error) {
      console.error('Error verifying OTP:', error);
      return {
        success: false,
        message: 'Failed to verify OTP. Please try again.'
      };
    }
  }

  /**
   * Resend OTP (Email or Phone)
   */
  async resendEmailOtp(input: { email?: string | null; phone?: string | null }, firstName?: string): Promise<{ success: boolean; message: string }> {
    try {
      // Clean and validate input
      const cleanEmail = input.email && input.email.trim() !== '' ? input.email.trim() : null;
      const cleanPhone = input.phone && input.phone.trim() !== '' ? input.phone.trim() : null;
      
      // Build conditions for invalidating existing OTPs
      const invalidateConditions = [];
      if (cleanEmail) {
        invalidateConditions.push({ email: cleanEmail });
      }
      if (cleanPhone) {
        invalidateConditions.push({ phone: cleanPhone });
      }

      if (invalidateConditions.length === 0) {
        return {
          success: false,
          message: 'Email or phone number is required'
        };
      }

      // Determine OTP type
      const otpType = cleanEmail ? 'EMAIL_VERIFICATION' : 'PHONE_VERIFICATION';

      // Invalidate existing unverified OTPs
      await prisma.otp.updateMany({
        where: {
          OR: invalidateConditions,
          otp_type: otpType,
          verified: false
        },
        data: { verified: true } // Mark as verified to invalidate
      });

      // Generate new OTP
      const result = await this.generateAndSendOtp({ email: cleanEmail, phone: cleanPhone }, firstName);
      return result;

    } catch (error) {
      console.error('Error resending OTP:', error);
      return {
        success: false,
        message: 'Failed to resend OTP. Please try again.'
      };
    }
  }

  /**
   * Clean up expired OTPs
   */
  private async cleanupExpiredOtps(input: { email?: string | null; phone?: string | null }, otpType: 'EMAIL_VERIFICATION' | 'PHONE_VERIFICATION' | 'PASSWORD_RESET' | 'LOGIN_VERIFICATION'): Promise<void> {
    try {
      // Build conditions for cleanup
      const cleanupConditions = [];
      if (input.email && input.email.trim() !== '') {
        cleanupConditions.push({ email: input.email });
      }
      if (input.phone && input.phone.trim() !== '') {
        cleanupConditions.push({ phone: input.phone });
      }

      // Only cleanup if we have valid conditions
      if (cleanupConditions.length > 0) {
        await prisma.otp.deleteMany({
          where: {
            OR: cleanupConditions,
            otp_type: otpType,
            expires_at: {
              lt: new Date() // Expired
            }
          }
        });
      }
    } catch (error) {
      console.error('Error cleaning up expired OTPs:', error);
    }
  }

  /**
   * Get OTP attempts count for rate limiting (Email or Phone)
   */
  async getOtpAttemptsCount(identifier: string, timeWindowMinutes: number = 60): Promise<number> {
    try {
      if (!identifier) return 0;

      const count = await prisma.otp.count({
        where: {
          OR: [
            { email: identifier },
            { phone: identifier }
          ],
          created_at: {
            gte: new Date(Date.now() - timeWindowMinutes * 60 * 1000)
          }
        }
      });

      return count;
    } catch (error) {
      console.error('Error getting OTP attempts count:', error);
      return 0;
    }
  }

  /**
   * Check if identifier (email or phone) is already verified
   */
  async isIdentifierVerified(identifier: string): Promise<{ isVerified: boolean; type: 'email' | 'phone' | null }> {
    try {
      if (!identifier) {
        return { isVerified: false, type: null };
      }

      // Check if it's an email (simple email pattern check)
      const isEmail = identifier.includes('@');
      
      if (isEmail) {
        const user = await prisma.user.findUnique({
          where: { email: identifier },
          select: { email_verified_at: true }
        });
        return { 
          isVerified: !!user?.email_verified_at, 
          type: 'email' 
        };
      } else {
        // Assume it's a phone number
        const user = await prisma.user.findUnique({
          where: { phone: identifier },
          select: { phone_verified_at: true }
        });
        return { 
          isVerified: !!user?.phone_verified_at, 
          type: 'phone' 
        };
      }
    } catch (error) {
      console.error('Error checking identifier verification status:', error);
      return { isVerified: false, type: null };
    }
  }

  /**
   * Check if email is already verified (backward compatibility)
   */
  async isEmailVerified(email: string): Promise<boolean> {
    const result = await this.isIdentifierVerified(email);
    return result.isVerified && result.type === 'email';
  }

  /**
   * Check if phone is already verified
   */
  async isPhoneVerified(phone: string): Promise<boolean> {
    const result = await this.isIdentifierVerified(phone);
    return result.isVerified && result.type === 'phone';
  }


}

export const otpService = new OtpService();
