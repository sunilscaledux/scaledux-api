import { prisma } from "@config/prisma"

interface OTPResponse {
  success: boolean
  message: string
  otp?: string // For development/testing
}

interface VerifyResponse {
  success: boolean
  message: string
  isValid?: boolean
}

class PhoneOTPService {
  /**
   * Generate a random OTP code
   */
  private generateOtpCode(length: number = 6): string {
    const digits = "0123456789"
    let otp = ""

    for (let i = 0; i < length; i++) {
      otp += digits[Math.floor(Math.random() * digits.length)]
    }

    return otp
  }

  /**
   * Clean up expired OTPs for phone number
   */
  private async cleanupExpiredOtps(phoneNumber: string): Promise<void> {
    try {
      await prisma.otp.deleteMany({
        where: {
          phone: phoneNumber,
          otp_type: "PHONE_VERIFICATION",
          expires_at: {
            lt: new Date(), // Expired
          },
        },
      })
    } catch (error) {
      console.error("Error cleaning up expired OTPs:", error)
    }
  }

  /**
   * Send OTP to phone number
   */
  async sendOTP(phoneNumber: string): Promise<OTPResponse> {
    try {
      const formattedPhone = this.formatPhoneNumber(phoneNumber)
      
      await this.cleanupExpiredOtps(formattedPhone)

      const otpCode = this.generateOtpCode(6)
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

      await prisma.otp.create({
        data: {
          phone: formattedPhone,
          otp_code: otpCode,
          otp_type: "PHONE_VERIFICATION",
          expires_at: expiresAt,
          verified: false
        }
      })

      console.log(`📱 SMS OTP for ${formattedPhone}: ${otpCode}`)

      return {
        success: true,
        message: 'OTP sent successfully',
        otp: process.env.NODE_ENV === 'development' ? otpCode : otpCode // Only in dev
      }
    } catch (error: any) {
      console.error('Send OTP Error:', error)
      return {
        success: false,
        message: error.message || 'Failed to send OTP'
      }
    }
  }

  /**
   * Verify OTP code
   */
  async verifyOTP(phoneNumber: string, code: string): Promise<VerifyResponse> {
    try {
      // Format phone number to E.164 format
      const formattedPhone = this.formatPhoneNumber(phoneNumber)
      
      // Clean up expired OTPs first
      await this.cleanupExpiredOtps(formattedPhone)

      // Find valid OTP
      const otpRecord = await prisma.otp.findFirst({
        where: {
          phone: formattedPhone,
          otp_code: code,
          otp_type: "PHONE_VERIFICATION",
          verified: false,
          expires_at: {
            gt: new Date(), // Not expired
          },
        },
      })

      if (!otpRecord) {
        return {
          success: true,
          message: 'Invalid or expired OTP code',
          isValid: false
        }
      }

      // Mark OTP as verified
      await prisma.otp.update({
        where: { id: otpRecord.id },
        data: { verified: true }
      })

      return {
        success: true,
        message: 'OTP verified successfully',
        isValid: true
      }
    } catch (error: any) {
      console.error('Verify OTP Error:', error)
      return {
        success: false,
        message: error.message || 'Failed to verify OTP'
      }
    }
  }


  private formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '')
    
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1)
    }
    
    if (!cleaned.startsWith('91') && cleaned.length === 10) {
      cleaned = '91' + cleaned
    }
    
    return '+' + cleaned
  }

  isValidPhoneNumber(phoneNumber: string): boolean {
    const cleaned = phoneNumber.replace(/\D/g, '')
    return cleaned.length === 10 || (cleaned.length === 12 && cleaned.startsWith('91'))
  }
}

export default new PhoneOTPService()
