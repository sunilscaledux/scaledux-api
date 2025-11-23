import { Request, Response } from 'express'
import { prisma } from '@config/prisma'
import { ApiResponse } from '@utils/ApiResponse'
import { getRelativePath, getFileUrl } from '@utils/General'
import fs from 'fs'
import path from 'path'

/**
 * Get identity verification status
 */
export async function getIdentityVerificationStatus(req: Request, res: Response) {
  try {
    const userId = req.user?.id

    if (!userId) {
      return ApiResponse.error(res, "User not authenticated", 401)
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        identity_verified_at: true,
        identity_verification_status: true
      }
    })

    if (!user) {
      return ApiResponse.error(res, "User not found", 404)
    }

    const isVerified = !!user.identity_verified_at
    const status = user.identity_verification_status || 'PENDING'

    return ApiResponse.success(res, {
      isVerified,
      status, // PENDING, UNDER_REVIEW, APPROVED, REJECTED
      verifiedAt: user.identity_verified_at
    }, "Identity verification status retrieved successfully")

  } catch (error: any) {
    console.error("Get Identity Verification Status Error:", error)
    return ApiResponse.error(res, "Failed to get identity verification status")
  }
}

/**
 * Submit identity verification documents
 */
export async function submitIdentityVerification(req: Request, res: Response) {
  try {
    const userId = req.user?.id
    const {
      customerInformation,
      idInformation,
      keycodeVerification,
      proofOfAddress
    } = req.body

    if (!userId) {
      return ApiResponse.error(res, "User not authenticated", 401)
    }

    // Validate required fields
    if (!customerInformation?.firstName || !customerInformation?.lastName || !customerInformation?.dob) {
      return ApiResponse.error(res, "Customer information is required", 400)
    }

    if (!idInformation?.idType || !idInformation?.idNumber || !idInformation?.idImage?.length) {
      return ApiResponse.error(res, "ID information and documents are required", 400)
    }

    if (!keycodeVerification?.picture?.length) {
      return ApiResponse.error(res, "Selfie verification is required", 400)
    }

    if (!proofOfAddress?.address1 || !proofOfAddress?.city || !proofOfAddress?.country) {
      return ApiResponse.error(res, "Proof of address is required", 400)
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return ApiResponse.error(res, "User not found", 404)
    }

    // Check if already verified
    if (user.identity_verified_at) {
      return ApiResponse.error(res, "Identity is already verified", 400)
    }

    // Check if there's a pending submission
    const existingSubmission = await prisma.identityVerification.findFirst({
      where: { 
        user_id: userId,
        status: { in: ['PENDING', 'UNDER_REVIEW'] }
      }
    })

    if (existingSubmission) {
      return ApiResponse.error(res, "You already have a pending identity verification submission", 400)
    }

    // Create identity verification record
    const identityVerification = await prisma.identityVerification.create({
      data: {
        user_id: userId,
        // Customer Information
        first_name: customerInformation.firstName,
        last_name: customerInformation.lastName,
        date_of_birth: new Date(customerInformation.dob),
        nationality: customerInformation.country,
        
        // ID Information
        id_type: idInformation.idType,
        id_number: idInformation.idNumber,
        id_expiry_date: idInformation.idExpiryDate ? new Date(idInformation.idExpiryDate) : null,
        issuing_country: idInformation.issuingCountry,
        id_document_urls: idInformation.idImage,
        
        // Selfie/Keycode Verification
        selfie_urls: keycodeVerification.picture,
        
        // Proof of Address
        address_line_1: proofOfAddress.address1,
        address_line_2: proofOfAddress.address2 || null,
        city: proofOfAddress.city,
        state: proofOfAddress.state || null,
        postal_code: proofOfAddress.zipCode || null,
        address_country: proofOfAddress.country,
        proof_of_address_consent: proofOfAddress.proofConcent || null,
        
        status: 'UNDER_REVIEW',
        submitted_at: new Date()
      }
    })

    // Update user status
    await prisma.user.update({
      where: { id: userId },
      data: {
        identity_verification_status: 'UNDER_REVIEW'
      }
    })

    return ApiResponse.success(res, {
      verificationId: identityVerification.id,
      status: 'UNDER_REVIEW',
      message: "Identity verification submitted successfully"
    }, "Identity verification submitted for review")

  } catch (error: any) {
    console.error("Submit Identity Verification Error:", error)
    return ApiResponse.error(res, "Failed to submit identity verification")
  }
}

/**
 * Get identity verification details
 */
export async function getIdentityVerificationDetails(req: Request, res: Response) {
  try {
    const userId = req.user?.id

    if (!userId) {
      return ApiResponse.error(res, "User not authenticated", 401)
    }

    const verification = await prisma.identityVerification.findFirst({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' }
    })

    if (!verification) {
      return ApiResponse.error(res, "No identity verification found", 404)
    }

    return ApiResponse.success(res, {
      id: verification.id,
      status: verification.status,
      submittedAt: verification.submitted_at,
      reviewedAt: verification.reviewed_at,
      rejectionReason: verification.rejection_reason,
      customerInformation: {
        firstName: verification.first_name,
        lastName: verification.last_name,
        dob: verification.date_of_birth,
        country: verification.nationality
      },
      idInformation: {
        idType: verification.id_type,
        idNumber: verification.id_number,
        idExpiryDate: verification.id_expiry_date,
        issuingCountry: verification.issuing_country,
        idImage: verification.id_document_urls
      },
      keycodeVerification: {
        picture: verification.selfie_urls
      },
      proofOfAddress: {
        address1: verification.address_line_1,
        address2: verification.address_line_2,
        city: verification.city,
        state: verification.state,
        zipCode: verification.postal_code,
        country: verification.address_country,
        proofConcent: verification.proof_of_address_consent
      }
    }, "Identity verification details retrieved successfully")

  } catch (error: any) {
    console.error("Get Identity Verification Details Error:", error)
    return ApiResponse.error(res, "Failed to get identity verification details")
  }
}

/**
 * Upload ID document images
 */
export async function uploadIdDocuments(req: Request, res: Response) {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return ApiResponse.error(res, "No files uploaded", 400)
    }

    const userId = req.user?.id
    if (!userId) {
      return ApiResponse.error(res, "User not authenticated", 401)
    }

    // Process uploaded files and get their relative paths and full URLs
    const documentPaths = req.files.map((file: any) => getRelativePath(file.path))
    const documentUrls = documentPaths.map((path: string) => getFileUrl(path))

    return ApiResponse.success(
      res,
      { 
        documentUrls,
        documentPaths // Also return paths for deletion
      },
      "ID documents uploaded successfully"
    )
  } catch (error: any) {
    console.error("Error uploading ID documents:", error)
    return ApiResponse.error(res, "Failed to upload ID documents", 500)
  }
}

/**
 * Upload selfie images for keycode verification
 */
export async function uploadSelfieImages(req: Request, res: Response) {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return ApiResponse.error(res, "No files uploaded", 400)
    }

    const userId = req.user?.id
    if (!userId) {
      return ApiResponse.error(res, "User not authenticated", 401)
    }

    // Process uploaded files and get their relative paths and full URLs
    const selfiePaths = req.files.map((file: any) => getRelativePath(file.path))
    const selfieUrls = selfiePaths.map((path: string) => getFileUrl(path))

    return ApiResponse.success(
      res,
      { 
        selfieUrls,
        selfiePaths // Also return paths for deletion
      },
      "Selfie images uploaded successfully"
    )
  } catch (error: any) {
    console.error("Error uploading selfie images:", error)
    return ApiResponse.error(res, "Failed to upload selfie images", 500)
  }
}

/**
 * Delete ID document image
 */
export async function deleteIdDocument(req: Request, res: Response) {
  try {
    const { filePath } = req.body
    const userId = req.user?.id

    if (!userId) {
      return ApiResponse.error(res, "User not authenticated", 401)
    }

    if (!filePath) {
      return ApiResponse.error(res, "File path is required", 400)
    }

    // Construct full file path
    const fullPath = path.join(process.cwd(), filePath)

    // Check if file exists and delete it
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath)
    }

    return ApiResponse.success(
      res,
      { deletedPath: filePath },
      "ID document deleted successfully"
    )
  } catch (error: any) {
    console.error("Error deleting ID document:", error)
    return ApiResponse.error(res, "Failed to delete ID document", 500)
  }
}

/**
 * Delete selfie image
 */
export async function deleteSelfieImage(req: Request, res: Response) {
  try {
    const { filePath } = req.body
    const userId = req.user?.id

    if (!userId) {
      return ApiResponse.error(res, "User not authenticated", 401)
    }

    if (!filePath) {
      return ApiResponse.error(res, "File path is required", 400)
    }

    // Construct full file path
    const fullPath = path.join(process.cwd(), filePath)

    // Check if file exists and delete it
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath)
    }

    return ApiResponse.success(
      res,
      { deletedPath: filePath },
      "Selfie image deleted successfully"
    )
  } catch (error: any) {
    console.error("Error deleting selfie image:", error)
    return ApiResponse.error(res, "Failed to delete selfie image", 500)
  }
}
