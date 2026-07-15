import { Request, Response } from 'express'
import { prisma } from "../../services/prismaService";
import { Log } from '@services/loggerService';
import { ApiResponse } from "@utils/ApiResponse"
import SmsService from "@services/SmsService"
import { verifyOtpByType, generateAndSendOtp, OTP_TYPES } from '@module/auth/AuthService'
import { normalizePhone } from '@utils/General';
import { updateCompletionSection } from '../profile/ProfileCompletionService';

export async function sendPhoneOTP(req: Request, res: Response) {
  try {
    const phone = normalizePhone(req.body?.phone)
    const userId = req.user?.id
    if (!phone) {
      return ApiResponse.error(res, "Phone number is required", 400)
    }



    if (!SmsService.isValidPhoneNumber(phone)) {
      return ApiResponse.error(res, "Invalid phone number format", 400)
    }

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

    const otpResult = await generateAndSendOtp({
      phone: phone,
      otpType: OTP_TYPES.PHONE_VERIFICATION,
      userId: userId
    })

    if (!otpResult.success) {
      return ApiResponse.error(res, otpResult.message, 400)
    }

    return ApiResponse.success(res, {
      message: "OTP sent successfully",
      phone: phone
    }, "OTP sent to your phone number")

  } catch (error: any) {
    Log.error("Error", { error })
    return ApiResponse.error(res, "Failed to send OTP")
  }
}

export async function verifyPhoneOTP(req: Request, res: Response) {
  try {
    const { otp } = req.body
    const userId = req.user?.id

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


    // Verify OTP using local service
    const verifyResult = await verifyOtpByType(otpRecord.phone, otp, "PHONE_VERIFICATION")

    if (!verifyResult.success) {
      return ApiResponse.error(res, verifyResult.message, 400)
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

    await updateCompletionSection(userId!, 'phoneVerification', true);

    return ApiResponse.success(res, {
      user: updatedUser,
      message: "Phone number verified successfully"
    }, "Phone verification completed")

  } catch (error: any) {
    Log.error("Error", { error })
    return ApiResponse.error(res, "Failed to verify OTP")
  }
}



