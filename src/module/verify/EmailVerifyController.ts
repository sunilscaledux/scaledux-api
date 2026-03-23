import { Request, Response } from 'express'
import { prisma } from "../../services/prismaService";
import { ApiResponse } from '@utils/ApiResponse'
import * as AuthService from '../auth/AuthService'
import { Log } from '@services/loggerService';

export async function sendEmailOTP(req: Request, res: Response) {
  try {
    const { email } = req.body
    const userId = req.user?.id

    if (!email) {
      return ApiResponse.error(res, "Email is required", 400)
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return ApiResponse.error(res, "Invalid email format", 400)
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        email: email,
        id: { not: userId },
        email_verified_at: { not: null }
      }
    })

    if (existingUser) {
      return ApiResponse.error(res, "This email is already verified by another user", 400)
    }

    // Generate and send OTP using existing OTP service
    const otpResult = await AuthService.generateAndSendOtp({
      email: email,
      otpType: AuthService.OTP_TYPES.EMAIL_VERIFICATION,
      userId: userId
    })

    if (!otpResult.success) {
      return ApiResponse.error(res, otpResult.message, 400)
    }

    return ApiResponse.success(res, {
      message: "OTP sent successfully",
      email: email
    }, "OTP sent to your email address")

  } catch (error: any) {
    Log.error("Error", { error })
    return ApiResponse.error(res, "Failed to send OTP")
  }
}

/**
 * Verify email OTP
 */
export async function verifyEmailOTP(req: Request, res: Response) {
  try {
    const { email, otp } = req.body
    const userId = req.user?.id

    if (!email || !otp) {
      return ApiResponse.error(res, "Email and OTP are required", 400)
    }


    // Verify OTP using existing OTP service
    const verifyResult = await AuthService.verifyOtpByType(
      email,
      otp,
      AuthService.OTP_TYPES.EMAIL_VERIFICATION
    )

    if (!verifyResult.success) {
      return ApiResponse.error(res, verifyResult.message, 400)
    }

    // Check if email is already used by another user (final check)
    const existingUser = await prisma.user.findFirst({
      where: {
        email: email,
        id: { not: userId },
        email_verified_at: { not: null }
      }
    })

    if (existingUser) {
      return ApiResponse.error(res, "This email is already verified by another user", 400)
    }

    // Update user's email verification status
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { 
        email_verified_at: new Date(),
        email: email
      },
      select: {
        id: true,
        email: true,
        email_verified_at: true
      }
    })

    return ApiResponse.success(res, {
      user: updatedUser,
      message: "Email verified successfully"
    }, "Email verification completed")

  } catch (error: any) {
    Log.error("Error", { error })
    return ApiResponse.error(res, "Failed to verify OTP")
  }
}

