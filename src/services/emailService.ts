import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import mailConfig from "@config/mail";
import { Log } from "@services/loggerService";
import { templateService } from "./templateService";

export interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: {
    address: string;
    name?: string;
  };
}

class EmailService {
  private transporter: Transporter | null = null;
  private isConfigured = false;

  constructor() {
    const host = mailConfig.SMTP_HOST;
    const port = mailConfig.SMTP_PORT;
    const user = mailConfig.SMTP_USER;
    const pass = mailConfig.SMTP_PASS;

    if (!host || !user || !pass) {
      Log.warn("SMTP not configured (SMTP_HOST / SMTP_USER / SMTP_PASS) - Email service disabled");
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      this.isConfigured = true;
      Log.info("Email service initialized (SMTP)", { host, port });
    } catch (error) {
      Log.error("Failed to initialize email service", { error });
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      Log.warn("Email service not configured - Skipping email to", { to: options.to });
      return false;
    }

    try {
      const fromAddress = options.from?.address ?? mailConfig.SMTP_FROM_EMAIL;
      const fromName = options.from?.name ?? mailConfig.SMTP_FROM_NAME;

      await this.transporter.sendMail({
        from: fromName ? `"${fromName}" <${fromAddress}>` : fromAddress,
        to: options.to,
        subject: options.subject,
        html: options.html || undefined,
        text: options.text || undefined,
      });

      Log.info("Email sent successfully", { to: options.to, subject: options.subject });
      return true;
    } catch (error) {
      Log.error("Failed to send email", { error, to: options.to });
      return false;
    }
  }

  async sendOtpEmail(
    email: string,
    otp: string,
    firstName?: string,
    subject?: string,
  ): Promise<boolean> {
    try {
      const template = await templateService.getOtpTemplate({
        firstName,
        otpCode: otp,
        otpValidity: mailConfig.OTP_VALIDITY_MINUTES,
        subject,
      });

      return await this.sendEmail({
        to: email,
        subject: template.subject,
        html: template.html,
      });
    } catch (error) {
      Log.error("Failed to generate OTP email template", { error });
      return false;
    }
  }

  async sendWelcomeEmail(email: string, firstName: string): Promise<boolean> {
    try {
      const template = await templateService.getWelcomeTemplate({
        firstName,
      });

      return await this.sendEmail({
        to: email,
        subject: template.subject,
        html: template.html,
      });
    } catch (error) {
      Log.error("Failed to generate welcome email template", { error });
      return false;
    }
  }

  async sendPasswordResetEmail(
    email: string,
    otp: string,
  ): Promise<boolean> {
    return this.sendOtpEmail(email, otp, undefined, 'Reset Your Password');
  }

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
        subject || `Notification from ${mailConfig.APP_NAME}`
      );

      return await this.sendEmail({
        to: email,
        subject: template.subject,
        html: template.html,
      });
    } catch (error) {
      Log.error("Failed to generate custom email template", { error });
      return false;
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.transporter) {
      Log.error("SMTP not configured");
      return false;
    }
    try {
      await this.transporter.verify();
      Log.info("SMTP connection verified");
      return true;
    } catch (error) {
      Log.error("SMTP connection failed", { error });
      return false;
    }
  }
}

export const emailService = new EmailService();
