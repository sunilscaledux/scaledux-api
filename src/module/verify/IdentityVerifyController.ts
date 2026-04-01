import { Request, Response } from 'express'
import { prisma } from "../../services/prismaService";
import { ApiResponse } from '@utils/ApiResponse'
import { Log } from '@services/loggerService';

/**
 * Get identity verification details
 */
export async function getIdentityVerificationDetails(req: Request, res: Response) {
  try {
    const userId = req.user?.id

    const verification = await prisma.identityVerification.findFirst({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' }
    })

    if (!verification) {
      return ApiResponse.error(res, "No identity verification found", 404)
    }

    return ApiResponse.success(res, {
      id: verification.id,
      verificationType: verification.verification_type,
      status: verification.status,
      metaData: verification.meta_data,
      submittedAt: verification.submitted_at,
      verifiedAt: verification.verified_at,
      rejectionReason: verification.rejection_reason,
    }, "Identity verification details retrieved successfully")

  } catch (error: any) {
    Log.error("Error", { error })
    return ApiResponse.error(res, "Failed to get identity verification details")
  }
}
