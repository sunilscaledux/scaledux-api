import mailConfig from "@config/mail";
import { templateService } from "./templateService";

const { SendMailClient } = require("zeptomail");

export interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  /** Optional. If omitted, uses ZEPTO_FROM_EMAIL / ZEPTO_FROM_NAME from config */
  from?: {
    address: string;
    name?: string;
  };
}

class EmailService {
  private client: any;
  private isConfigured: boolean;

  constructor() {
    const url = mailConfig.ZEPTO_URL;
    const token = mailConfig.ZEPTO_TOKEN;

    if (!token) {
      console.warn("⚠️  ZEPTO_TOKEN not configured - Email service will be disabled");
      this.isConfigured = false;
      return;
    }

    try {
      this.client = new SendMailClient({ url, token });
      this.isConfigured = true;
      console.log("✅ Email service initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize email service:", error);
      this.isConfigured = false;
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.isConfigured) {
      console.warn("⚠️  Email service not configured - Skipping email to:", options.to);
      return false;
    }

    try {
      const fromAddress = options.from?.address ?? mailConfig.ZEPTO_FROM_EMAIL ?? "test@scaledux.com";
      const fromName = options.from?.name ?? mailConfig.ZEPTO_FROM_NAME ?? "";
      const mailData = {
        from: {
          address: fromAddress,
          name: fromName,
        },
        to: [
          {
            email_address: {
              address: options.to,
              name: "",
            },
          },
        ],
        subject: options.subject,
        htmlbody: options.html || "",
        textbody: options.text || "",
      };

      const response = await this.client.sendMail(mailData);
      console.log("✅ Email sent successfully via ZeptoMail:", response);
      return true;
    } catch (error) {
      console.error("❌ Failed to send email via ZeptoMail:", error);
      return false;
    }
  }

  /**
   * Send OTP verification email
   */
  async sendOtpEmail(
    email: string,
    otp: string,
    firstName?: string
  ): Promise<boolean> {
    try {
      const template = await templateService.getOtpTemplate({
        firstName,
        otpCode: otp,
        companyName: mailConfig.COMPANY_NAME,
        otpValidity: mailConfig.OTP_VALIDITY_MINUTES
      });

      return await this.sendEmail({
        to: email,
        subject: template.subject,
        html: template.html,
      });
    } catch (error) {
      console.error("Failed to generate OTP email template:", error);
      return false;
    }
  }

  /**
   * Send welcome email after successful verification
   */
  async sendWelcomeEmail(email: string, firstName: string): Promise<boolean> {
    try {
      const template = await templateService.getWelcomeTemplate({
        firstName,
        companyName: mailConfig.COMPANY_NAME
      });

      return await this.sendEmail({
        to: email,
        subject: template.subject,
        html: template.html,
      });
    } catch (error) {
      console.error("Failed to generate welcome email template:", error);
      return false;
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    email: string,
    otp: string,
  ): Promise<boolean> {
    try {
      const template = await templateService.getPasswordResetTemplate({
        OTP_CODE:otp,
        companyName: mailConfig.COMPANY_NAME,
        linkValidity: mailConfig.OTP_VALIDITY_MINUTES
      });

      return await this.sendEmail({
        to: email,
        subject: template.subject,
        html: template.html,
      });
    } catch (error) {
      console.error("Failed to generate password reset email template:", error);
      return false;
    }
  }

  /**
   * Send custom email using template
   */
  async sendCustomEmail(
    email: string,
    templateName: string,
    variables: { [key: string]: string | number | boolean },
    subject?: string
  ): Promise<boolean> {
    try {
      const template = await templateService.getCustomTemplate(
        templateName,
        variables,
        subject || `Notification from ${mailConfig.COMPANY_NAME}`
      );

      return await this.sendEmail({
        to: email,
        subject: template.subject,
        html: template.html,
      });
    } catch (error) {
      console.error("Failed to generate custom email template:", error);
      return false;
    }
  }

  /**
   * Test email configuration
   */
  async testConnection(): Promise<boolean> {
    try {
      // Send a test email to verify the configuration
      const testResult = await this.sendEmail({
        to: mailConfig.ZEPTO_FROM_EMAIL || "test@scaledux.com",
        subject: "ZeptoMail Test Email",
        html: "<div><b>ZeptoMail service is working correctly!</b></div>",
      });

      if (testResult) {
        console.log("ZeptoMail service is ready");
        return true;
      } else {
        console.error("ZeptoMail test failed");
        return false;
      }
    } catch (error) {
      console.error("ZeptoMail service configuration error:", error);
      return false;
    }
  }
}

export const emailService = new EmailService();
