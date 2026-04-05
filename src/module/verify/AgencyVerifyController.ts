import { Request, Response } from 'express'
import { prisma } from "../../services/prismaService";
import { ApiResponse } from '@utils/ApiResponse'
import { urlsOrPathsToAttachmentIds, markAttachmentsAttached } from '@services/attachmentService'
import { uploadFile } from '@module/general/FileController'
import { resolveAttachmentUrls } from '@services/attachmentService'
import fs from 'fs'
import path from 'path'
import { Log } from '@services/loggerService';
import { appConfig } from '@config/app';
import { getResubmitWindow } from '@utils/General';
import { verifyCIN, isConfigured as isIdtoaiConfigured } from '@services/idtoaiService';



/**
 * Submit agency verification
 */
export async function submitAgencyVerification(req: Request, res: Response) {
  const userId = req.user?.id
  const { agencyName, cin, documents } = req.body



  // Validate required fields
  if (!agencyName || !cin) {
    return ApiResponse.error(res, "Agency name and CIN are required", 400)
  }

  if (!documents || !Array.isArray(documents) || documents.length === 0) {
    return ApiResponse.error(res, "At least one document is required", 400)
  }

  const normalizedDocumentUrls = urlsOrPathsToAttachmentIds(documents)

  // ── Real-time CIN verification — only save if verified ──
  if (!isIdtoaiConfigured()) {
    return ApiResponse.error(res, "CIN verification service is temporarily unavailable. Please try again later.", 503)
  }

  const cinResult = await verifyCIN(cin, String(userId))

  if (!cinResult.success) {
    return ApiResponse.error(res, cinResult.error || "CIN verification failed. Please check your CIN and try again.", 400)
  }

  // Check company is active
  const companyStatus = (cinResult.companyStatus || '').toLowerCase()
  if (companyStatus && companyStatus !== 'active') {
    return ApiResponse.error(res, `Company is not active. Only active companies can be verified.`, 400)
  }

  // Match company name
  if (cinResult.companyName) {
    const cinName = cinResult.companyName.trim().toLowerCase()
    const submittedName = agencyName.trim().toLowerCase()
    if (!cinName.includes(submittedName) && !submittedName.includes(cinName)) {
      return ApiResponse.error(res, `Company name does not match CIN. Please ensure your agency name matches your CIN registration.`, 400)
    }
  }

  Log.info(`[agency-verify] CIN ${cin} verified for user ${userId}`)

  // Verified — save
  const existingVerification = await prisma.agencyVerification.findFirst({
    where: { user_id: userId },
    orderBy: { created_at: 'desc' }
  })

  const verifiedAt = new Date()
  let agencyVerification

  if (existingVerification) {
    agencyVerification = await prisma.agencyVerification.update({
      where: { id: existingVerification.id },
      data: {
        agency_name: agencyName,
        cin: cin,
        document_urls: normalizedDocumentUrls,
        status: 'APPROVED',
        submitted_at: verifiedAt,
        verified_at: verifiedAt,
        rejection_reason: null
      }
    })
  } else {
    agencyVerification = await prisma.agencyVerification.create({
      data: {
        user_id: userId,
        agency_name: agencyName,
        cin: cin,
        document_urls: normalizedDocumentUrls,
        status: 'APPROVED',
        submitted_at: verifiedAt,
        verified_at: verifiedAt,
      }
    })
  }

  if (normalizedDocumentUrls.length > 0) {
    await markAttachmentsAttached(normalizedDocumentUrls, [userId!])
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      agency_verification_status: 'APPROVED',
      agency_verified_at: verifiedAt,
    }
  })

  return ApiResponse.success(res, {
    verificationId: agencyVerification.id,
    status: 'APPROVED',
  }, "Agency verified and saved successfully")
}

/**
 * Get agency verification details
 */
export async function getAgencyVerificationDetails(req: Request, res: Response) {
  const userId = req.user?.id



  const agencyVerification = await prisma.agencyVerification.findFirst({
    where: { user_id: userId },
    orderBy: { created_at: 'desc' }
  })

  if (!agencyVerification) {
    return ApiResponse.error(res, "No agency verification found", 404)
  }

  // Convert relative paths or attachment ids to full URLs for documents
  const documentUrls = Array.isArray(agencyVerification.document_urls)
    ? await resolveAttachmentUrls(agencyVerification.document_urls as string[], 'document_urls')
    : []

  const cooldown = getResubmitWindow(agencyVerification.verified_at, appConfig.verification.agencyCooldownDays)

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
    canSubmit: cooldown.canSubmit,
    nextSubmitAllowedAt: cooldown.nextSubmitAllowedAt
  }, "Agency verification details retrieved successfully")
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
      verified_by: adminId,
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
}
