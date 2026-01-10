"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = void 0;
const mail_1 = __importDefault(require("@config/mail"));
const templateService_1 = require("./templateService");
const { SendMailClient } = require("zeptomail");
class EmailService {
    constructor() {
        const url = mail_1.default.ZEPTO_URL;
        const token = mail_1.default.ZEPTO_TOKEN;
        if (!token) {
            console.warn("⚠️  ZEPTO_TOKEN not configured - Email service will be disabled");
            this.isConfigured = false;
            return;
        }
        try {
            this.client = new SendMailClient({ url, token });
            this.isConfigured = true;
            console.log("✅ Email service initialized successfully");
        }
        catch (error) {
            console.error("❌ Failed to initialize email service:", error);
            this.isConfigured = false;
        }
    }
    async sendEmail(options) {
        if (!this.isConfigured) {
            console.warn("⚠️  Email service not configured - Skipping email to:", options.to);
            return false;
        }
        try {
            const mailData = {
                from: {
                    address: mail_1.default.ZEPTO_FROM_EMAIL || "test@scaledux.com",
                    name: mail_1.default.ZEPTO_FROM_NAME,
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
        }
        catch (error) {
            console.error("❌ Failed to send email via ZeptoMail:", error);
            return false;
        }
    }
    /**
     * Send OTP verification email
     */
    async sendOtpEmail(email, otp, firstName) {
        try {
            const template = await templateService_1.templateService.getOtpTemplate({
                firstName,
                otpCode: otp,
                companyName: mail_1.default.COMPANY_NAME,
                otpValidity: mail_1.default.OTP_VALIDITY_MINUTES
            });
            return await this.sendEmail({
                to: email,
                subject: template.subject,
                html: template.html,
            });
        }
        catch (error) {
            console.error("Failed to generate OTP email template:", error);
            return false;
        }
    }
    /**
     * Send welcome email after successful verification
     */
    async sendWelcomeEmail(email, firstName) {
        try {
            const template = await templateService_1.templateService.getWelcomeTemplate({
                firstName,
                companyName: mail_1.default.COMPANY_NAME
            });
            return await this.sendEmail({
                to: email,
                subject: template.subject,
                html: template.html,
            });
        }
        catch (error) {
            console.error("Failed to generate welcome email template:", error);
            return false;
        }
    }
    /**
     * Send password reset email
     */
    async sendPasswordResetEmail(email, otp) {
        try {
            const template = await templateService_1.templateService.getPasswordResetTemplate({
                OTP_CODE: otp,
                companyName: mail_1.default.COMPANY_NAME,
                linkValidity: mail_1.default.OTP_VALIDITY_MINUTES
            });
            return await this.sendEmail({
                to: email,
                subject: template.subject,
                html: template.html,
            });
        }
        catch (error) {
            console.error("Failed to generate password reset email template:", error);
            return false;
        }
    }
    /**
     * Send custom email using template
     */
    async sendCustomEmail(email, templateName, variables, subject) {
        try {
            const template = await templateService_1.templateService.getCustomTemplate(templateName, variables, subject || `Notification from ${mail_1.default.COMPANY_NAME}`);
            return await this.sendEmail({
                to: email,
                subject: template.subject,
                html: template.html,
            });
        }
        catch (error) {
            console.error("Failed to generate custom email template:", error);
            return false;
        }
    }
    /**
     * Test email configuration
     */
    async testConnection() {
        try {
            // Send a test email to verify the configuration
            const testResult = await this.sendEmail({
                to: mail_1.default.ZEPTO_FROM_EMAIL || "test@scaledux.com",
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
