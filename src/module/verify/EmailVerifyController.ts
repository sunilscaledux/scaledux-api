import { Request, Response } from 'express'
import { prisma } from "../../services/prismaService";
import { ApiResponse } from '@utils/ApiResponse'
import * as AuthService from '../auth/AuthService'

/**
 * Get email verification status
 */
export async function getEmailVerificationStatus(req: Request, res: Response) {
  try {
    const userId = req.user?.id

    if (!userId) {
      return ApiResponse.error(res, "User not authenticated", 401)
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        email_verified_at: true
      }
    })

    if (!user) {
      return ApiResponse.error(res, "User not found", 404)
    }

    const isVerified = !!user.email_verified_at
    let canVerify = true
    let daysUntilNextVerification = 0

    // Check if email was verified within last 7 days
    if (user.email_verified_at) {
      const verifiedDate = new Date(user.email_verified_at)
      const daysSinceVerification = Math.floor((Date.now() - verifiedDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysSinceVerification < 7) {
        canVerify = false
        daysUntilNextVerification = 7 - daysSinceVerification
      }
    }

    return ApiResponse.success(res, {
      isVerified,
      email: user.email,
      canVerify,
      daysUntilNextVerification,
      verifiedAt: user.email_verified_at
    }, "Email verification status retrieved successfully")

  } catch (error: any) {
    console.error("Get Email Verification Status Error:", error)
    return ApiResponse.error(res, "Failed to get email verification status")
  }
}

/**
 * Send email OTP for verification
 */
export async function sendEmailOTP(req: Request, res: Response) {
  try {
    const { email } = req.body
    const userId = req.user?.id

    if (!userId) {
      return ApiResponse.error(res, "User not authenticated", 401)
    }

    if (!email) {
      return ApiResponse.error(res, "Email is required", 400)
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return ApiResponse.error(res, "Invalid email format", 400)
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return ApiResponse.error(res, "User not found", 404)
    }

    // Check if email was verified within 7 days
    if (user.email_verified_at) {
      const verifiedDate = new Date(user.email_verified_at)
      const daysSinceVerification = Math.floor((Date.now() - verifiedDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysSinceVerification < 7) {
        return ApiResponse.error(res, `Email was verified ${daysSinceVerification} days ago. You can verify again after ${7 - daysSinceVerification} days.`, 400)
      }
    }

    // Check if email is already used by another user
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
      otpType: 'REGISTRATION_VERIFICATION',
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
    console.error("Send Email OTP Error:", error)
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

    if (!userId) {
      return ApiResponse.error(res, "User not authenticated", 401)
    }

    if (!email || !otp) {
      return ApiResponse.error(res, "Email and OTP are required", 400)
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return ApiResponse.error(res, "User not found", 404)
    }

    // Verify OTP using existing OTP service
    const verifyResult = await AuthService.verifyOtpByType(
      email,
      otp,
      'REGISTRATION_VERIFICATION'
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
    console.error("Verify Email OTP Error:", error)
    return ApiResponse.error(res, "Failed to verify OTP")
  }
}

/**
 * Update email address (for verified users who can re-verify)
 */
export async function updateEmailAddress(req: Request, res: Response) {
  try {
    const { email } = req.body
    const userId = req.user?.id

    if (!userId) {
      return ApiResponse.error(res, "User not authenticated", 401)
    }

    if (!email) {
      return ApiResponse.error(res, "Email is required", 400)
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return ApiResponse.error(res, "Invalid email format", 400)
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return ApiResponse.error(res, "User not found", 404)
    }

    // Check if email is already used by another user
    const existingUser = await prisma.user.findFirst({
      where: {
        email: email,
        id: { not: userId }
      }
    })

    if (existingUser) {
      return ApiResponse.error(res, "This email is already in use by another user", 400)
    }

    // Update user's email and reset verification status
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { 
        email: email,
        email_verified_at: null // Reset verification status
      },
      select: {
        id: true,
        email: true,
        email_verified_at: true
      }
    })

    return ApiResponse.success(res, {
      user: updatedUser,
      message: "Email updated successfully. Please verify your new email address."
    }, "Email updated successfully")

  } catch (error: any) {
    console.error("Update Email Error:", error)
    return ApiResponse.error(res, "Failed to update email")
  }
}
