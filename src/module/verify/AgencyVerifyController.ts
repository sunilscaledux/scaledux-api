import { Request, Response } from 'express'
import { prisma } from "../../services/prismaService";
import { ApiResponse } from '@utils/ApiResponse'
import { extractRelativePath, getRelativePath, getFileUrl, normalizeUploadedPaths } from '@utils/General'
import fs from 'fs'
import path from 'path'

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

    let agencyVerification

    const normalizedDocumentUrls = normalizeUploadedPaths(documents)

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
    console.error("Submit Agency Verification Error:", error)
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

    // Convert relative paths to full URLs for documents
    const documentUrls = Array.isArray(agencyVerification.document_urls) 
      ? (agencyVerification.document_urls as string[]).map((url: string) => getFileUrl(url)) 
      : []

    return ApiResponse.success(res, {
      id: agencyVerification.id,
      agencyName: agencyVerification.agency_name,
      cin: agencyVerification.cin,
      documents: documentUrls,
      status: agencyVerification.status,
      submittedAt: agencyVerification.submitted_at,
      verifiedAt: agencyVerification.verified_at,
      rejectionReason: agencyVerification.rejection_reason
    }, "Agency verification details retrieved successfully")

  } catch (error: any) {
    console.error("Get Agency Verification Details Error:", error)
    return ApiResponse.error(res, "Failed to get agency verification details")
  }
}

/**
 * Upload agency documents
 */
export async function uploadAgencyDocuments(req: Request, res: Response) {
  try {
    const userId = req.user?.id

    if (!userId) {
      return ApiResponse.error(res, "User not authenticated", 401)
    }

    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return ApiResponse.error(res, "No files uploaded", 400)
    }

    // Process uploaded files and get their relative paths and full URLs
    const documentPaths = req.files.map((file: any) => getRelativePath(file.path))
    const documentUrls = documentPaths.map((path: string) => getFileUrl(path))

    return ApiResponse.success(
      res,
      {
        documentPaths,
        documentUrls,
        message: "Documents uploaded successfully"
      },
      "Documents uploaded successfully"
    )

  } catch (error: any) {
    console.error("Upload Agency Documents Error:", error)
    return ApiResponse.error(res, "Failed to upload documents")
  }
}

/**
 * Delete agency document
 */
export async function deleteAgencyDocument(req: Request, res: Response) {
  try {
    const userId = req.user?.id
    const { documentPath } = req.body

    if (!userId) {
      return ApiResponse.error(res, "User not authenticated", 401)
    }

    if (!documentPath) {
      return ApiResponse.error(res, "Document path is required", 400)
    }

    const relativePath = extractRelativePath(documentPath)
    const fullPath = path.join(process.cwd(), relativePath)
     console.log(relativePath,fullPath);
    // Check if file exists and delete it
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath)
    }

    return ApiResponse.success(res, {
      message: "Document deleted successfully"
    }, "Document deleted successfully")

  } catch (error: any) {
    console.error("Delete Agency Document Error:", error)
    return ApiResponse.error(res, "Failed to delete document")
  }
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
        // agency_verified_at: status === 'APPROVED' ? currentTime : null // TODO: Uncomment after migration
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
    console.error("Update Agency Verification Status Error:", error)
    return ApiResponse.error(res, "Failed to update agency verification status")
  }
}
