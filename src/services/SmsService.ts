import { Log } from '@services/loggerService';

const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY || '';
const MSG91_OTP_TEMPLATE_ID = process.env.MSG91_OTP_TEMPLATE_ID || '';

interface OTPResponse {
  success: boolean;
  message: string;
}

class PhoneOTPService {
  /**
   * Send OTP to phone number via MSG91
   */
  async sendOTP(phoneNumber: string, otpCode: string): Promise<OTPResponse> {

    Log.info(MSG91_AUTH_KEY,MSG91_OTP_TEMPLATE_ID)
    try {
      const formattedPhone = this.formatPhoneNumber(phoneNumber);

      if (MSG91_AUTH_KEY && MSG91_OTP_TEMPLATE_ID) {
        const mobile = formattedPhone.replace('+', '');
        const url = `https://control.msg91.com/api/v5/otp?template_id=${MSG91_OTP_TEMPLATE_ID}&mobile=${mobile}&authkey=${MSG91_AUTH_KEY}&otp=${otpCode}`;

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          const errorData = await response.text();
          Log.error("MSG91 OTP send failed", { status: response.status, body: errorData });
          return { success: false, message: "Failed to send OTP via SMS" };
        }
      } else {
        Log.warn("MSG91 credentials not configured, OTP not sent via SMS", { otp: otpCode });
      }

      return {
        success: true,
        message: "OTP sent successfully",
      };
    } catch (error: any) {
      Log.error("Error", { error });
      return {
        success: false,
        message: error.message || "Failed to send OTP",
      };
    }
  }

  private formatPhoneNumber(phoneNumber: string): string {
    let cleaned = phoneNumber.replace(/\D/g, "");

    if (cleaned.startsWith("0")) {
      cleaned = cleaned.substring(1);
    }

    if (!cleaned.startsWith("91") && cleaned.length === 10) {
      cleaned = "91" + cleaned;
    }

    return "+" + cleaned;
  }

  isValidPhoneNumber(phoneNumber: string): boolean {
    const cleaned = phoneNumber.replace(/\D/g, "");
    return (
      cleaned.length === 10 ||
      (cleaned.length === 12 && cleaned.startsWith("91"))
    );
  }
}

export default new PhoneOTPService();
