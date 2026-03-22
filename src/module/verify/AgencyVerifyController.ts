import { Request, Response } from 'express'
import { prisma } from "../../services/prismaService";
import { ApiResponse } from '@utils/ApiResponse'
import { urlsOrPathsToAttachmentIds } from '@services/attachmentService'
import { uploadFile } from '@module/general/FileController'
import { resolveAttachmentUrls } from '@services/attachmentService'
import fs from 'fs'
import path from 'path'
import { Log } from '@services/loggerService';
import { appConfig } from '@config/app';
import { getResubmitWindow } from '@utils/verificationPolicy';



/**
 * Submit agency verification
 */
export async function submitAgencyVerification(req: Request, res: Response) {
  try {
    const userId = req.user?.id
    const { agencyName, cin, documents } = req.body

    if (!userId) {
      return ApiResponse.error(res, "User not authenticated", 401)
    }

    // Validate required fields
    if (!agencyName || !cin) {
      return ApiResponse.error(res, "Agency name and CIN are required", 400)
    }

    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return ApiResponse.error(res, "At least one document is required", 400)
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return ApiResponse.error(res, "User not found", 404)
    }

    // Check for existing verification (any status)
    const existingVerification = await prisma.agencyVerification.findFirst({
      where: { 
        user_id: userId
      },
      orderBy: { created_at: 'desc' }
    })

    // If there's a pending submission, don't allow new submission
    if (existingVerification && ['PENDING', 'UNDER_REVIEW'].includes(existingVerification.status)) {
      return ApiResponse.error(res, "You already have a pending agency verification submission", 400)
    }

    const lastApprovedAgency = await prisma.agencyVerification.findFirst({
      where: { user_id: userId, status: 'APPROVED' },
      orderBy: { verified_at: 'desc' }
    })
    if (lastApprovedAgency?.verified_at) {
      const cooldown = getResubmitWindow(lastApprovedAgency.verified_at, appConfig.verification.agencyCooldownDays)
      if (!cooldown.canSubmit && cooldown.nextSubmitAllowedAt) {
        return ApiResponse.error(
          res,
          `Agency verification can be updated at most once every ${appConfig.verification.agencyCooldownDays} days after approval. You can submit again after ${cooldown.nextSubmitAllowedAt.toISOString()}.`,
          429
        )
      }
    }

    let agencyVerification

    const normalizedDocumentUrls = urlsOrPathsToAttachmentIds(documents)

    if (existingVerification) {
      // Update existing verification (for rejected or any other status)
      agencyVerification = await prisma.agencyVerification.update({
        where: { id: existingVerification.id },
        data: {
          agency_name: agencyName,
          cin: cin,
          document_urls: normalizedDocumentUrls,
          status: 'UNDER_REVIEW',
          submitted_at: new Date(),
          rejection_reason: null // Clear previous rejection reason
        }
      })
    } else {
      // Create new verification
      agencyVerification = await prisma.agencyVerification.create({
        data: {
          user_id: userId,
          agency_name: agencyName,
          cin: cin,
          document_urls: normalizedDocumentUrls,
          status: 'UNDER_REVIEW',
          submitted_at: new Date()
        }
      })
    }

    // Update user status
    await prisma.user.update({
      where: { id: userId },
      data: {
        agency_verification_status: 'UNDER_REVIEW'
      }
    })

    return ApiResponse.success(res, {
      verificationId: agencyVerification.id,
      status: 'UNDER_REVIEW',
      message: "Agency verification submitted successfully"
    }, "Agency verification submitted for review")

  } catch (error: any) {
    Log.error("Error", { error })
    return ApiResponse.error(res, "Failed to submit agency verification")
  }
}

/**
 * Get agency verification details
 */
export async function getAgencyVerificationDetails(req: Request, res: Response) {
  try {
    const userId = req.user?.id

    if (!userId) {
      return ApiResponse.error(res, "User not authenticated", 401)
    }

    const agencyVerification = await prisma.agencyVerification.findFirst({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' }
    })

    if (!agencyVerification) {
      return ApiResponse.error(res, "No agency verification found", 404)
    }

    // Convert relative paths or attachment ids to full URLs for documents
    const documentUrls = Array.isArray(agencyVerification.document_urls)
      ? await resolveAttachmentUrls(agencyVerification.document_urls as string[], { entityType: 'agencyVerification', fieldName: 'document_urls' })
      : []

    return ApiResponse.success(res, {
      id: agencyVerification.id,
      agencyName: agencyVerification.agency_name,
      cin: agencyVerification.cin,
      documents: documentUrls,
      status: agencyVerification.status,
      submittedAt: agencyVerification.submitted_at,
      verifiedAt: agencyVerification.verified_at,
      rejectionReason: agencyVerification.rejection_reason,
      cooldownDays: appConfig.verification.agencyCooldownDays,
      cansubmit: getResubmitWindow(agencyVerification.verified_at, appConfig.verification.agencyCooldownDays).canSubmit
    }, "Agency verification details retrieved successfully")

  } catch (error: any) {
    Log.error("Error", { error })
    return ApiResponse.error(res, "Failed to get agency verification details")
  }
}

/**
 * Upload agency documents
 */
export async function uploadAgencyDocuments(req: Request, res: Response) {
  return uploadFile(req, res);
}

/**
 * Admin function to approve or reject agency verification
 * This function should be called by admin interface
 */
export async function updateAgencyVerificationStatus(req: Request, res: Response) {
  try {
    const { verificationId, status, rejectionReason } = req.body
    const adminId = req.user?.id

    if (!adminId) {
      return ApiResponse.error(res, "Admin not authenticated", 401)
    }

    // Validate required fields
    if (!verificationId || !status) {
      return ApiResponse.error(res, "Verification ID and status are required", 400)
    }

    // Validate status
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return ApiResponse.error(res, "Status must be APPROVED or REJECTED", 400)
    }

    // If rejecting, rejection reason is required
    if (status === 'REJECTED' && !rejectionReason) {
      return ApiResponse.error(res, "Rejection reason is required when rejecting", 400)
    }

    // Find the agency verification
    const agencyVerification = await prisma.agencyVerification.findUnique({
      where: { id: verificationId },
      include: { user: true }
    })

    if (!agencyVerification) {
      return ApiResponse.error(res, "Agency verification not found", 404)
    }

    const currentTime = new Date()

    // Update agency verification status
    const updatedVerification = await prisma.agencyVerification.update({
      where: { id: verificationId },
      data: {
        status: status,
        verified_at: status === 'APPROVED' ? currentTime : null,
        reviewed_by: adminId,
        rejection_reason: status === 'REJECTED' ? rejectionReason : null
      }
    })

    // Update user's agency verification status and verified_at timestamp
    await prisma.user.update({
      where: { id: agencyVerification.user_id },
      data: {
        agency_verification_status: status,
        agency_verified_at: status === 'APPROVED' ? currentTime : null
      }
    })

    return ApiResponse.success(res, {
      verificationId: updatedVerification.id,
      status: updatedVerification.status,
      verifiedAt: updatedVerification.verified_at,
      reviewedBy: adminId,
      message: `Agency verification ${status.toLowerCase()} successfully`
    }, `Agency verification ${status.toLowerCase()} successfully`)

  } catch (error: any) {
    Log.error("Error", { error })
    return ApiResponse.error(res, "Failed to update agency verification status")
  }
}
