import { Request, Response } from 'express'
import { prisma } from "../../services/prismaService";
import { Log } from '@services/loggerService';
import { ApiResponse } from "@utils/ApiResponse"
import TwilioService from "@services/TwilioService"

// Send OTP to phone number
export async function sendPhoneOTP(req: Request, res: Response) {
  try {
    const { phone } = req.body
    const userId = req.user?.id

    if (!userId) {
      return ApiResponse.error(res, "User not authenticated", 401)
    }

    if (!phone) {
      return ApiResponse.error(res, "Phone number is required", 400)
    }

    // Validate phone number format
    if (!TwilioService.isValidPhoneNumber(phone)) {
      return ApiResponse.error(res, "Invalid phone number format", 400)
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return ApiResponse.error(res, "User not found", 404)
    }

    // Check if phone is already verified and within 7 days
    if (user.phone_verified_at) {
      const verifiedDate = new Date(user.phone_verified_at)
      const daysSinceVerification = Math.floor((Date.now() - verifiedDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysSinceVerification < 7) {
        return ApiResponse.error(res, `Phone number was verified ${daysSinceVerification} days ago. You can verify again after ${7 - daysSinceVerification} days.`, 400)
      }
    }

    // Check if phone number is already used by another user
    const existingUser = await prisma.user.findFirst({
      where: {
        phone: phone,
        id: { not: userId },
        phone_verified_at: { not: null }
      }
    })

    if (existingUser) {
      return ApiResponse.error(res, "This phone number is already verified by another user", 400)
    }

    // Send OTP using local OTP service (stores in database)
    const otpResult = await TwilioService.sendOTP(phone)

    if (!otpResult.success) {
      return ApiResponse.error(res, otpResult.message, 400)
    }

    return ApiResponse.success(res, {
      message: "OTP sent successfully",
      phone: phone,
      otp: otpResult.otp // Only in development
    }, "OTP sent to your phone number")

  } catch (error: any) {
    Log.error("Error", { error })
    return ApiResponse.error(res, "Failed to send OTP")
  }
}

// Verify OTP and update phone verification status
export async function verifyPhoneOTP(req: Request, res: Response) {
  try {
    const { otp } = req.body
    const userId = req.user?.id

    if (!userId) {
      return ApiResponse.error(res, "User not authenticated", 401)
    }

    if (!otp) {
      return ApiResponse.error(res, "OTP is required", 400)
    }

    // Find the OTP record in database to get the phone number
    const otpRecord = await prisma.otp.findFirst({
      where: {
        otp_code: otp,
        otp_type: "PHONE_VERIFICATION",
        verified: false,
        expires_at: {
          gt: new Date(), // Not expired
        },
      },
      orderBy: {
        created_at: 'desc' // Get the most recent OTP
      }
    })

    if (!otpRecord || !otpRecord.phone) {
      return ApiResponse.error(res, "Invalid or expired OTP code", 400)
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return ApiResponse.error(res, "User not found", 404)
    }

    // Verify OTP using local service
    const verifyResult = await TwilioService.verifyOTP(otpRecord.phone, otp)

    if (!verifyResult.success) {
      return ApiResponse.error(res, verifyResult.message, 400)
    }

    if (!verifyResult.isValid) {
      return ApiResponse.error(res, "Invalid OTP code", 400)
    }

    // Check if phone number is already used by another user (final check)
    const existingUser = await prisma.user.findFirst({
      where: {
        phone: otpRecord.phone,
        id: { not: userId },
        phone_verified_at: { not: null }
      }
    })

    if (existingUser) {
      return ApiResponse.error(res, "This phone number is already verified by another user", 400)
    }

    // Update user's phone verification status in database
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { 
        phone_verified_at: new Date(),
        phone: otpRecord.phone // Save the phone number from OTP record
      },
      select: {
        id: true,
        phone: true,
        phone_verified_at: true
      }
    })

    return ApiResponse.success(res, {
      user: updatedUser,
      message: "Phone number verified successfully"
    }, "Phone verification completed")

  } catch (error: any) {
    Log.error("Error", { error })
    return ApiResponse.error(res, "Failed to verify OTP")
  }
}

// Get phone verification status
export async function getPhoneVerificationStatus(req: Request, res: Response) {
  try {
    const userId = req.user?.id

    if (!userId) {
      return ApiResponse.error(res, "User not authenticated", 401)
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        phone: true,
        phone_verified_at: true
      }
    })

    if (!user) {
      return ApiResponse.error(res, "User not found", 404)
    }

    let canVerify = true
    let daysUntilNextVerification = 0

    if (user.phone_verified_at) {
      const verifiedDate = new Date(user.phone_verified_at)
      const daysSinceVerification = Math.floor((Date.now() - verifiedDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysSinceVerification < 7) {
        canVerify = false
        daysUntilNextVerification = 7 - daysSinceVerification
      }
    }

    return ApiResponse.success(res, {
      phone: user.phone,
      isVerified: !!user.phone_verified_at,
      verifiedAt: user.phone_verified_at,
      canVerify,
      daysUntilNextVerification
    }, "Phone verification status retrieved")

  } catch (error: any) {
    Log.error("Error", { error })
    return ApiResponse.error(res, "Failed to get verification status")
  }
}

// Update phone number (only if not verified or after 7 days)
export async function updatePhoneNumber(req: Request, res: Response) {
  try {
    const { phone } = req.body
    const userId = req.user?.id

    if (!userId) {
      return ApiResponse.error(res, "User not authenticated", 401)
    }

    if (!phone) {
      return ApiResponse.error(res, "Phone number is required", 400)
    }

    // Validate phone number format
    if (!TwilioService.isValidPhoneNumber(phone)) {
      return ApiResponse.error(res, "Invalid phone number format", 400)
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return ApiResponse.error(res, "User not found", 404)
    }

    // Check if phone is verified and within 7 days
    if (user.phone_verified_at) {
      const verifiedDate = new Date(user.phone_verified_at)
      const daysSinceVerification = Math.floor((Date.now() - verifiedDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysSinceVerification < 7) {
        return ApiResponse.error(res, `Phone number was verified ${daysSinceVerification} days ago. You can update it after ${7 - daysSinceVerification} days.`, 400)
      }
    }

    // Check if phone number is already used by another user
    const existingUser = await prisma.user.findFirst({
      where: {
        phone: phone,
        id: { not: userId },
        phone_verified_at: { not: null }
      }
    })

    if (existingUser) {
      return ApiResponse.error(res, "This phone number is already verified by another user", 400)
    }

    // Update phone number and reset verification
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { 
        phone: phone,
        phone_verified_at: null // Reset verification when phone is changed
      },
      select: {
        id: true,
        phone: true,
        phone_verified_at: true
      }
    })

    return ApiResponse.success(res, {
      user: updatedUser
    }, "Phone number updated successfully")

  } catch (error: any) {
    Log.error("Error", { error })
    return ApiResponse.error(res, "Failed to update phone number")
  }
}
