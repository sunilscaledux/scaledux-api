import { Request, Response } from 'express'
import { prisma } from "../../services/prismaService";
import { ApiResponse } from '@utils/ApiResponse'
import { getResubmitWindow } from '@utils/General'
import { appConfig } from '@config/app'

/**
 * Get identity verification details. Returns basic details + cooldown info
 */
export async function getIdentityVerificationDetails(req: Request, res: Response) {
  const userId = req.user?.id

  const verification = await prisma.identityVerification.findFirst({
    where: { user_id: userId },
    orderBy: { created_at: 'desc' }
  })

  if (!verification) {
    return ApiResponse.success(res, {
      isVerified: false,
      status: null,
      verifiedAt: null,
      canEdit: true,
      nextEditAllowedAt: null,
      cooldownDays: appConfig.verification.identityCooldownDays,
    }, "No identity verification found")
  }

  const isVerified = verification.status === 'APPROVED'
  const cooldown = getResubmitWindow(verification.verified_at, appConfig.verification.identityCooldownDays)
  const meta = verification.meta_data as any

  return ApiResponse.success(res, {
    id: verification.id,
    verificationType: verification.verification_type,
    status: verification.status,
    isVerified,
    verifiedMessage: isVerified ? 'Identity verified' : null,
    // Basic details from verification (safe to show)
    name: meta?.name || null,
    dob: meta?.dob || null,
    gender: meta?.gender || null,
    image: meta?.image || null,
    submittedAt: verification.submitted_at,
    verifiedAt: verification.verified_at,
    rejectionReason: verification.rejection_reason,
    canEdit: !isVerified || cooldown.canSubmit,
    nextEditAllowedAt: cooldown.nextSubmitAllowedAt,
    cooldownDays: appConfig.verification.identityCooldownDays,
  }, "Identity verification details retrieved successfully")
}
