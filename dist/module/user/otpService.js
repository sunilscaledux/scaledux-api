"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.otpService = exports.OtpService = void 0;
const emailService_1 = require("../../services/emailService");
const prisma_1 = require("../../config/prisma");
const userService_1 = require("./userService");
class OtpService {
    /**
     * Generate a random OTP code
     */
    generateOtpCode(length = 6) {
        const digits = "0123456789";
        let otp = "";
        for (let i = 0; i < length; i++) {
            otp += digits[Math.floor(Math.random() * digits.length)];
        }
        return otp;
    }
    /**
     * Clean up expired OTPs for identifier and specific type
     */
    async cleanupExpiredOtps(identifier, otpType) {
        try {
            const whereCondition = {
                OR: [{ email: identifier }, { phone: identifier }],
                expires_at: {
                    lt: new Date(), // Expired
                },
            };
            // Add OTP type filter if specified
            if (otpType) {
                whereCondition.otp_type = otpType;
            }
            await prisma_1.prisma.otp.deleteMany({
                where: whereCondition,
            });
        }
        catch (error) {
            console.error("Error cleaning up expired OTPs:", error);
        }
    }
    /**
     * Generate, store and send OTP
     */
    async generateAndSendOtp(data) {
        try {
            const identifier = data.email;
            if (!identifier) {
                return {
                    success: false,
                    message: "Email or phone number is required",
                };
            }
            // Clean up expired OTPs first
            await this.cleanupExpiredOtps(identifier, data.otpType);
            // Generate OTP code
            const otpCode = this.generateOtpCode();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
            // Save OTP to database
            const otp = await prisma_1.prisma.otp.create({
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
            let sent = true;
            let message = "";
            if (data.email) {
                sent = await this.sendEmailOtp(data.email, otpCode);
                message = sent
                    ? "OTP sent successfully to your email"
                    : "Failed to send OTP email. Please try again.";
            }
            else if (data.phone) {
                sent = await this.sendSmsOtp(data.phone, otpCode);
                message = sent
                    ? "OTP sent successfully to your phone"
                    : "Failed to send OTP SMS. Please try again.";
            }
            if (!sent) {
                // Delete OTP if sending failed
                await prisma_1.prisma.otp.delete({ where: { id: otp.id } });
                return {
                    success: false,
                    message,
                };
            }
            return {
                success: true,
                message,
                data: {
                    otpId: otp.id,
                },
            };
        }
        catch (error) {
            console.error("Error generating and sending OTP:", error);
            return {
                success: false,
                message: "Failed to generate OTP. Please try again.",
            };
        }
    }
    /**
     * Generic method to verify OTP by type
     */
    async verifyOtpByType(identifier, otpCode, otpType) {
        try {
            if (!identifier || !otpCode) {
                return {
                    success: false,
                    message: "Identifier and OTP are required",
                };
            }
            const contactInfo = (0, userService_1.normalizeContact)(identifier);
            // Build where conditions for the specified OTP type
            const whereConditions = {
                otp_code: otpCode,
                verified: false,
                expires_at: {
                    gt: new Date(), // Must not be expired
                },
                otp_type: otpType
            };
            // Add identifier conditions
            if (contactInfo.email) {
                whereConditions.email = contactInfo.email;
            }
            else if (contactInfo.phone) {
                whereConditions.phone = contactInfo.phone;
            }
            else {
                return {
                    success: false,
                    message: "Invalid email or phone format",
                };
            }
            // Find valid OTP
            const otp = await prisma_1.prisma.otp.findFirst({
                where: whereConditions,
                orderBy: {
                    created_at: 'desc', // Get the most recent OTP
                },
            });
            if (!otp) {
                const typeMessages = {
                    "REGISTRATION_VERIFICATION": "Invalid or expired registration OTP",
                    "LOGIN_VERIFICATION": "Invalid or expired login OTP",
                    "FORGOT_PASSWORD_VERIFICATION": "Invalid or expired password reset OTP"
                };
                return {
                    success: false,
                    message: typeMessages[otpType],
                };
            }
            // Mark OTP as verified
            await prisma_1.prisma.otp.update({
                where: { id: otp.id },
                data: { verified: true },
            });
            // Invalidate other unverified OTPs of the same type for this identifier
            await prisma_1.prisma.otp.updateMany({
                where: {
                    OR: [
                        { email: contactInfo.email },
                        { phone: contactInfo.phone }
                    ].filter(Boolean),
                    verified: false,
                    otp_type: otpType,
                    id: { not: otp.id },
                },
                data: { verified: true },
            });
            const verificationType = otp.email ? "Email" : "Phone";
            const successMessages = {
                "REGISTRATION_VERIFICATION": `${verificationType} verified successfully`,
                "LOGIN_VERIFICATION": `${verificationType} login OTP verified successfully`,
                "FORGOT_PASSWORD_VERIFICATION": `${verificationType} password reset OTP verified successfully`
            };
            return {
                success: true,
                message: successMessages[otpType],
                data: otp,
            };
        }
        catch (error) {
            console.error("Error verifying OTP:", error);
            return {
                success: false,
                message: "Failed to verify OTP. Please try again.",
            };
        }
    }
    /**
     * Resend OTP (legacy method for backward compatibility - defaults to registration)
     */
    async resendOtp(data) {
        return this.resendOtpByType(data, "REGISTRATION_VERIFICATION");
    }
    /**
     * Generic method to resend OTP by type
     */
    async resendOtpByType(data, otpType) {
        try {
            const identifier = data.email || data.phone;
            if (!identifier) {
                return {
                    success: false,
                    message: "Email or phone number is required",
                };
            }
            // Invalidate existing unverified OTPs of the same type
            await prisma_1.prisma.otp.updateMany({
                where: {
                    OR: [{ email: identifier }, { phone: identifier }],
                    verified: false,
                    otp_type: otpType,
                },
                data: { verified: true },
            });
            // Generate and send new OTP
            const result = await this.generateAndSendOtp({
                email: data.email,
                phone: data.phone,
                otpType: otpType,
            });
            return {
                success: result.success,
                message: result.message,
            };
        }
        catch (error) {
            console.error("Error resending OTP:", error);
            return {
                success: false,
                message: "Failed to resend OTP. Please try again.",
            };
        }
    }
    /**
     * Get registration data from the most recent verified OTP for identifier
     */
    async getRegistrationData(identifier) {
        try {
            const otp = await prisma_1.prisma.otp.findFirst({
                where: {
                    OR: [{ email: identifier }, { phone: identifier }],
                    verified: true,
                    otp_type: "REGISTRATION_VERIFICATION",
                    expires_at: {
                        gt: new Date(), // Not expired
                    },
                },
                orderBy: {
                    created_at: "desc",
                },
            });
            if (!otp)
                return null;
            // Return the contact info from the OTP record
            return {
                email: otp.email,
                phone: otp.phone,
                otpId: otp.id,
                verified: otp.verified,
            };
        }
        catch (error) {
            console.error("Error getting registration data:", error);
            return null;
        }
    }
    /**
     * Send OTP via email
     */
    async sendEmailOtp(email, otpCode) {
        try {
            return await emailService_1.emailService.sendOtpEmail(email, otpCode);
        }
        catch (error) {
            console.error("Error sending email OTP:", error);
            return false;
        }
    }
    /**
     * Send OTP via SMS (placeholder for future implementation)
     */
    async sendSmsOtp(phone, otpCode) {
        try {
            // TODO: Implement SMS service when available
            // return await smsService.sendOtpSms(phone, otpCode, firstName);
            console.log(`SMS OTP ${otpCode} would be sent to ${phone}`);
            return true; // Temporary - assume success for phone
        }
        catch (error) {
            console.error("Error sending SMS OTP:", error);
            return false;
        }
    }
}
exports.OtpService = OtpService;
exports.otpService = new OtpService();
