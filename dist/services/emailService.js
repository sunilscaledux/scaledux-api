"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = void 0;
const { SendMailClient } = require("zeptomail");
class EmailService {
    constructor() {
        const url = process.env.ZEPTO_URL || "api.zeptomail.in/";
        const token = process.env.ZEPTO_TOKEN;
        if (!token) {
            throw new Error("ZEPTO_TOKEN is required in environment variables");
        }
        this.client = new SendMailClient({ url, token });
    }
    /**
     * Send send mail
     */
    async sendEmail(options) {
        try {
            const mailData = {
                from: {
                    address: process.env.ZEPTO_FROM_EMAIL || "noreply@scaledux.com",
                    name: process.env.APP_NAME || "ScaleDux",
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
            console.log("Email sent successfully via ZeptoMail:", response);
            return true;
        }
        catch (error) {
            console.error("Failed to send email via ZeptoMail:", error);
            return false;
        }
    }
    /**
     * Send OTP verification email
     */
    async sendOtpEmail(email, otp, firstName) {
        const subject = "Verify Your Email Address";
        const html = this.generateOtpEmailTemplate(otp, firstName);
        return await this.sendEmail({
            to: email,
            subject,
            html,
        });
    }
    /**
     * Send welcome email after successful verification
     */
    async sendWelcomeEmail(email, firstName) {
        const subject = "Welcome to ScaleDux!";
        const html = this.generateWelcomeEmailTemplate(firstName);
        return await this.sendEmail({
            to: email,
            subject,
            html,
        });
    }
    /**
     * Generate OTP email template
     */
    generateOtpEmailTemplate(otp, firstName) {
        return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .otp-code { background: #667eea; color: white; font-size: 32px; font-weight: bold; padding: 20px; text-align: center; border-radius: 8px; letter-spacing: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📧 Verify Your Email Address</h1>
          </div>
          <div class="content">
            <h2>Hello ${firstName || "there"}!</h2>
            <p>Thank you for registering with <strong>ScaleDux</strong>. To complete your registration, please verify your email address using the OTP code below:</p>
            
            <div class="otp-code">${otp}</div>
            
            <p><strong>Important:</strong></p>
            <ul>
              <li>This OTP is valid for <strong>10 minutes</strong> only</li>
              <li>Do not share this code with anyone</li>
              <li>If you didn't request this, please ignore this email</li>
            </ul>
            
            <p>If you have any questions, feel free to contact our support team.</p>
            
            <div class="footer">
              <p>Best regards,<br><strong>The ScaleDux Team</strong></p>
              <p><small>This is an automated email. Please do not reply to this message.</small></p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    }
    /**
     * Generate welcome email template
     */
    generateWelcomeEmailTemplate(firstName) {
        return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to ScaleDux</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to ScaleDux!</h1>
          </div>
          <div class="content">
            <h2>Hello ${firstName}!</h2>
            <p>Congratulations! Your email has been successfully verified and your account is now active.</p>
            
            <p>You can now enjoy all the features of ScaleDux:</p>
            <ul>
              <li>✅ Full access to your dashboard</li>
              <li>✅ Secure account management</li>
              <li>✅ Premium features and support</li>
            </ul>
            
            <p>If you have any questions or need assistance, our support team is here to help.</p>
            
            <div class="footer">
              <p>Welcome aboard!<br><strong>The ScaleDux Team</strong></p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    }
    /**
     * Test email configuration
     */
    async testConnection() {
        try {
            // Send a test email to verify the configuration
            const testResult = await this.sendEmail({
                to: process.env.ZEPTO_FROM_EMAIL || "test@scaledux.com",
                subject: "ZeptoMail Test Email",
                html: "<div><b>ZeptoMail service is working correctly!</b></div>",
            });
            if (testResult) {
                console.log("ZeptoMail service is ready");
                return true;
            }
            else {
                console.error("ZeptoMail test failed");
                return false;
            }
        }
        catch (error) {
            console.error("ZeptoMail service configuration error:", error);
            return false;
        }
    }
}
exports.emailService = new EmailService();
