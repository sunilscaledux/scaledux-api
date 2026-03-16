import { Request, Response } from 'express'
import { prisma } from "../../services/prismaService";
import { ApiResponse } from '@utils/ApiResponse'
import { toAttachmentIds } from '@utils/General'
import { resolveAttachmentUrls } from '@services/attachmentService'
import { updateCompletionSection } from '../profile/ProfileCompletionService'
import { uploadFile } from '@module/general/FileController'
import fs from 'fs'
import path from 'path'
import { Log } from '@services/loggerService';

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
        identity_verification_status: true,
        identityVerifications: {
          orderBy: { created_at: 'desc' },
          take: 1,
          select: {
            rejection_reason: true,
            status: true
          }
        }
      }
    })

    if (!user) {
      return ApiResponse.error(res, "User not found", 404)
    }

    const isVerified = !!user.identity_verified_at
    const status = user.identity_verification_status || 'PENDING'
    const latestVerification = user.identityVerifications[0]

    return ApiResponse.success(res, {
      isVerified,
      status, // PENDING, UNDER_REVIEW, APPROVED, REJECTED
      verifiedAt: user.identity_verified_at,
      rejectionReason: latestVerification?.rejection_reason || null
    }, "Identity verification status retrieved successfully")

  } catch (error: any) {
    Log.error("Error", { error })
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

    // Check for existing verification (any status)
    const existingVerification = await prisma.identityVerification.findFirst({
      where: { 
        user_id: userId
      },
      orderBy: { created_at: 'desc' }
    })

    // If there's a pending submission, don't allow new submission
    if (existingVerification && ['PENDING', 'UNDER_REVIEW'].includes(existingVerification.status)) {
      return ApiResponse.error(res, "You already have a pending identity verification submission", 400)
    }

    let identityVerification

    const idDocumentPaths = toAttachmentIds(idInformation?.idImage)
    const selfiePaths = toAttachmentIds(keycodeVerification?.picture)
    const addressProofPaths = toAttachmentIds(proofOfAddress?.uploadedAddressProofs)

    if (existingVerification) {
      // Update existing verification (for rejected or any other status)
      identityVerification = await prisma.identityVerification.update({
        where: { id: existingVerification.id },
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
        id_document_urls: idDocumentPaths as any,
        
        // Selfie/Keycode Verification
        selfie_urls: selfiePaths as any,
        
        // Proof of Address
        address_line_1: proofOfAddress.address1,
        address_line_2: proofOfAddress.address2 || null,
        city: proofOfAddress.city,
        state: proofOfAddress.state || null,
        postal_code: proofOfAddress.zipCode || null,
        address_country: proofOfAddress.country,
        proof_of_address_consent: proofOfAddress.proofConcent || null,
        
        // Address Proof Documents (only if user selected "No" for consent)
        address_proof_urls: addressProofPaths.length ? (addressProofPaths as any) : null,
        document_type: proofOfAddress.documentType || null,
        institution_name: proofOfAddress.institutionName || null,
        document_date_issued: proofOfAddress.dateIssued ? new Date(proofOfAddress.dateIssued) : null,
        
        status: 'UNDER_REVIEW',
        submitted_at: new Date()
      }
      })
    } else {
      // Create new verification
      identityVerification = await prisma.identityVerification.create({
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
          id_document_urls: idDocumentPaths as any,
          
          // Selfie/Keycode Verification
          selfie_urls: selfiePaths as any,
          
          // Proof of Address
          address_line_1: proofOfAddress.address1,
          address_line_2: proofOfAddress.address2 || null,
          city: proofOfAddress.city,
          state: proofOfAddress.state || null,
          postal_code: proofOfAddress.zipCode || null,
          address_country: proofOfAddress.country,
          proof_of_address_consent: proofOfAddress.proofConcent || null,
          
          // Address Proof Documents (only if user selected "No" for consent)
          address_proof_urls: addressProofPaths.length ? (addressProofPaths as any) : null,
          document_type: proofOfAddress.documentType || null,
          institution_name: proofOfAddress.institutionName || null,
          document_date_issued: proofOfAddress.dateIssued ? new Date(proofOfAddress.dateIssued) : null,
          
          status: 'UNDER_REVIEW',
          submitted_at: new Date()
        }
      })
    }

    // Update user status
    await prisma.user.update({
      where: { id: userId },
      data: {
        identity_verification_status: 'UNDER_REVIEW'
      }
    })
    await updateCompletionSection(userId, 'identityVerification', false)

    return ApiResponse.success(res, {
      verificationId: identityVerification.id,
      status: 'UNDER_REVIEW',
      message: "Identity verification submitted successfully"
    }, "Identity verification submitted for review")

  } catch (error: any) {
    Log.error("Error", { error })
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

    const idDocumentPaths = (verification.id_document_urls || []) as string[]
    const selfiePaths = (verification.selfie_urls || []) as string[]
    const addressProofPaths = (verification.address_proof_urls || []) as string[]

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
        idImage: await resolveAttachmentUrls(idDocumentPaths, { entityType: 'identityVerification', fieldName: 'id_documents' })
      },
      keycodeVerification: {
        picture: await resolveAttachmentUrls(selfiePaths, { entityType: 'identityVerification', fieldName: 'selfie' })
      },
      proofOfAddress: {
        address1: verification.address_line_1,
        address2: verification.address_line_2,
        city: verification.city,
        state: verification.state,
        zipCode: verification.postal_code,
        country: verification.address_country,
        proofConcent: verification.proof_of_address_consent,
        uploadedAddressProofs: await resolveAttachmentUrls(addressProofPaths, { entityType: 'identityVerification', fieldName: 'address_proof' }),
        documentType: verification.document_type,
        institutionName: verification.institution_name,
        dateIssued: verification.document_date_issued
      }
    }, "Identity verification details retrieved successfully")

  } catch (error: any) {
    Log.error("Error", { error })
    return ApiResponse.error(res, "Failed to get identity verification details")
  }
}

/**
 * Upload ID document images
 */
export async function uploadIdDocuments(req: Request, res: Response) {
  return uploadFile(req, res);
}

/**
 * Upload selfie images for keycode verification
 */
export async function uploadSelfieImages(req: Request, res: Response) {
  return uploadFile(req, res);
}

/**
 * Upload address proof documents
 */
export async function uploadAddressProof(req: Request, res: Response) {
  return uploadFile(req, res);
}
