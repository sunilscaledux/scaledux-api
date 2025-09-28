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
   * Generate and send  OTP
   */
  async generateAndSendOtp(input: any, firstName?: string, userId?: number): Promise<{ success: boolean; message: string; otpId?: number }> {
    try {
      // Clean up expired OTPs for this email
      await this.cleanupExpiredOtps(input.email, 'EMAIL_VERIFICATION');

      // Check if there's a recent valid OTP (within last 2 minutes to prevent spam)
      const recentOtp = await prisma.otp.findFirst({
        where: {
          OR:[
            {
              email:input.email,
              phone:input.phone
            }
          ],
          otp_type: 'EMAIL_VERIFICATION',
          verified: false,
          created_at: {
            gte: new Date(Date.now() - 2 * 60 * 1000) // 2 minutes ago
          }
        }
      });

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
          email:input.email,
          phone:input.phone,
          otp_code: otpCode,
          otp_type: 'EMAIL_VERIFICATION',
          expires_at: expiresAt,
        }
      });

      
      // Send otp
      let emailSent=null;
      if (input.email){
       emailSent = await emailService.sendOtpEmail(input, otpCode, firstName);
      }

       if (input.phone){
      //  TODO when we will have phone api
       }
      if (!emailSent) {
        await prisma.otp.delete({ where: { id: otp.id } });
        return {
          success: false,
          message: 'Failed to send OTP email. Please try again.'
        };
      }

      return {
        success: true,
        message: 'OTP sent successfully to your email',
        otpId: otp.id
      };

    } catch (error) {
      console.error('Error generating email OTP:', error);
      return {
        success: false,
        message: 'Failed to generate OTP. Please try again.'
      };
    }
  }

  /**
   * Verify OTP
   */
  async verifyOtp(input:any, otpCode: string): Promise<{ success: boolean; message: string; otpId?: number }> {
    try {
      // Find valid OTP
      const otp = await prisma.otp.findFirst({
        where: {
          OR:{
            email:input.email,
            phone:input.phone
          },
          otp_code: otpCode,
          otp_type: 'EMAIL_VERIFICATION',
          verified: false,
          expires_at: {
            gt: new Date() // Not expired
          }
        }
      });

      if (!otp) {
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

      // Update user's email_verified_at if user exists
      if (otp.user_id) {
       if (input.email) {
         await prisma.user.update({
          where: { id: otp.user_id },
          data: { email_verified_at: new Date() }
        });
       }
        if (input.phone) {
         await prisma.user.update({
          where: { id: otp.user_id },
          data: { phone_verified_at: new Date() }
        });
       }
      }

      return {
        success: true,
        message: 'Email verified successfully',
        otpId: otp.id
      };

    } catch (error) {
      console.error('Error verifying email OTP:', error);
      return {
        success: false,
        message: 'Failed to verify OTP. Please try again.'
      };
    }
  }

  /**
   * Resend OTP
   */
  async resendEmailOtp(input:any, firstName?: string): Promise<{ success: boolean; message: string }> {
    try {
      // Invalidate existing unverified OTPs
      await prisma.otp.updateMany({
        where: {
          OR:[
            {
              email:input.email,
              phone:input.phone
            }
          ],
          otp_type: 'EMAIL_VERIFICATION',
          verified: false
        },
        data: { verified: true } // Mark as verified to invalidate
      });

      // Generate new OTP
      const result = await this.generateAndSendOtp(input, firstName);
      return result;

    } catch (error) {
      console.error('Error resending email OTP:', error);
      return {
        success: false,
        message: 'Failed to resend OTP. Please try again.'
      };
    }
  }

  /**
   * Clean up expired OTPs
   */
  private async cleanupExpiredOtps(input:any, otpType: 'EMAIL_VERIFICATION' | 'PHONE_VERIFICATION' | 'PASSWORD_RESET' | 'LOGIN_VERIFICATION'): Promise<void> {
    try {
      await prisma.otp.deleteMany({
        where: {
          OR:[
            {
            email:input.email,
            phone:input.phone
            }
          ],
          otp_type: otpType,
          expires_at: {
            lt: new Date() // Expired
          }
        }
      });
    } catch (error) {
      console.error('Error cleaning up expired OTPs:', error);
    }
  }

  /**
   * Get OTP attempts count for rate limiting
   */
  async getOtpAttemptsCount(email: string, timeWindowMinutes: number = 60): Promise<number> {
    try {
      const count = await prisma.otp.count({
        where: {
          email,
          otp_type: 'EMAIL_VERIFICATION',
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
   * Check if email is already verified
   */
  async isEmailVerified(email: string): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { email },
        select: { email_verified_at: true }
      });

      return !!user?.email_verified_at;
    } catch (error) {
      console.error('Error checking email verification status:', error);
      return false;
    }
  }


}

export const otpService = new OtpService();
