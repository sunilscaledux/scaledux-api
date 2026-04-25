import { Log } from '@services/loggerService';

const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY || '';
const MSG91_WHATSAPP_TEMPLATE_NAME = process.env.MSG91_WHATSAPP_TEMPLATE_NAME || '';
const MSG91_WHATSAPP_INTEGRATED_NUMBER = process.env.MSG91_WHATSAPP_INTEGRATED_NUMBER || '';

interface WhatsappOTPResponse {
  success: boolean;
  message: string;
}

class WhatsappOTPService {
  /**
   * Send OTP to phone number via MSG91 WhatsApp
   */
  async sendOTP(phoneNumber: string, otpCode: string): Promise<WhatsappOTPResponse> {
    try {
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      const mobile = formattedPhone.replace('+', '');

      if (!MSG91_AUTH_KEY || !MSG91_WHATSAPP_TEMPLATE_NAME || !MSG91_WHATSAPP_INTEGRATED_NUMBER) {
        Log.warn("MSG91 WhatsApp credentials not configured, OTP not sent via WhatsApp", { otp: otpCode });
        return { success: false, message: "WhatsApp service not configured" };
      }

      const url = 'https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/';

      const body = {
        integrated_number: MSG91_WHATSAPP_INTEGRATED_NUMBER,
        content_type: "template",
        payload: {
          messaging_product: "whatsapp",
          type: "template",
          template: {
            name: MSG91_WHATSAPP_TEMPLATE_NAME,
            language: {
              code: "en",
              policy: "deterministic"
            },
            namespace: MSG91_WHATSAPP_TEMPLATE_NAME,
            to_and_components: [
              {
                to: [mobile],
                components: {
                  body: [
                    { type: "text", value: otpCode }
                  ]
                }
              }
            ]
          }
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authkey': MSG91_AUTH_KEY
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorData = await response.text();
        Log.error("MSG91 WhatsApp OTP send failed", { status: response.status, body: errorData });
        return { success: false, message: "Failed to send OTP via WhatsApp" };
      }

      return {
        success: true,
        message: "OTP sent successfully via WhatsApp",
      };
    } catch (error: any) {
      Log.error("WhatsApp OTP error", { error });
      return {
        success: false,
        message: error.message || "Failed to send OTP via WhatsApp",
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
}

export default new WhatsappOTPService();
