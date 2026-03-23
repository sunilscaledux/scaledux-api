import { Request, Response } from 'express'
import { prisma } from "../../services/prismaService";
import { ApiResponse } from '@utils/ApiResponse'
import { resolveAttachmentUrls, urlsOrPathsToAttachmentIds } from '@services/attachmentService'
import { updateCompletionSection } from '../profile/ProfileCompletionService'
import { Log } from '@services/loggerService';
import { appConfig } from '@config/app';
import { getResubmitWindow, generateKeycode } from '@utils/General';
import { isValidIdType } from '@constants/idTypes';

/**
 * Get user's keycode for identity verification
 */
export async function getKeycode(req: Request, res: Response) {
  try {
    const userId = req.user?.id

    let personalInfo = await prisma.personalInfo.findUnique({
      where: { user_id: userId },
      select: { keycode: true }
    })

    if (!personalInfo) {
      return ApiResponse.error(res, "Profile not found", 404)
    }

    // Generate keycode if missing (for existing users)
    if (!personalInfo.keycode) {
      const updated = await prisma.personalInfo.update({
        where: { user_id: userId },
        data: { keycode: generateKeycode() },
        select: { keycode: true }
      })
      personalInfo = updated
    }

    return ApiResponse.success(res, { keycode: personalInfo.keycode }, "Keycode retrieved successfully")
  } catch (error: any) {
    Log.error("Error getting keycode", { error })
    return ApiResponse.error(res, "Failed to get keycode")
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



    // Validate required fields
    if (!customerInformation?.firstName || !customerInformation?.lastName || !customerInformation?.dob) {
      return ApiResponse.error(res, "Customer information is required", 400)
    }

    if (!idInformation?.idType || !idInformation?.idNumber || !idInformation?.idImage?.length) {
      return ApiResponse.error(res, "ID information and documents are required", 400)
    }

    if (!isValidIdType(idInformation.idType)) {
      return ApiResponse.error(res, "Invalid ID type", 400)
    }

    if (!keycodeVerification?.picture?.length) {
      return ApiResponse.error(res, "Selfie verification is required", 400)
    }

    if (!proofOfAddress?.address1 || !proofOfAddress?.city || !proofOfAddress?.country) {
      return ApiResponse.error(res, "Proof of address is required", 400)
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

    const lastApproved = await prisma.identityVerification.findFirst({
      where: { user_id: userId, status: 'APPROVED' },
      orderBy: { verified_at: 'desc' }
    })
    const anchor = lastApproved?.verified_at ?? null
    const cooldown = getResubmitWindow(anchor, appConfig.verification.identityCooldownDays)
    if (!cooldown.canSubmit && cooldown.nextSubmitAllowedAt) {
      return ApiResponse.error(
        res,
        `Name changes through identity verification are limited to once every ${appConfig.verification.identityCooldownDays} days. You can submit again after ${cooldown.nextSubmitAllowedAt.toISOString()}.`,
        429
      )
    }

    let identityVerification

    const idDocumentPaths = urlsOrPathsToAttachmentIds(idInformation?.idImage || [])
    const selfiePaths = urlsOrPathsToAttachmentIds(keycodeVerification?.picture || [])
    const addressProofPaths = urlsOrPathsToAttachmentIds(proofOfAddress?.uploadedAddressProofs || [])

    // Get user's keycode to store with the verification
    const personalInfo = await prisma.personalInfo.findUnique({
      where: { user_id: userId },
      select: { keycode: true }
    })
    const userKeycode = personalInfo?.keycode || null

    if (existingVerification) {
      // Update existing verification (for rejected or any other status)
      identityVerification = await prisma.identityVerification.update({
        where: { id: existingVerification.id },
      data: {
        user_id: userId,
        // Customer Information
        first_name: customerInformation.firstName,
        middle_name: customerInformation.middleName || null,
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
        keycode: userKeycode,
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
          middle_name: customerInformation.middleName || null,
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
          keycode: userKeycode,
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
      verifiedAt: verification.verified_at,
      rejectionReason: verification.rejection_reason,
      customerInformation: {
        firstName: verification.first_name,
        middleName: verification.middle_name,
        lastName: verification.last_name,
        dob: verification.date_of_birth,
        country: verification.nationality
      },
      idInformation: {
        idType: verification.id_type,
        idNumber: verification.id_number,
        idExpiryDate: verification.id_expiry_date,
        issuingCountry: verification.issuing_country,
        idImage: await resolveAttachmentUrls(idDocumentPaths, 'id_documents')
      },
      keycodeVerification: {
        picture: await resolveAttachmentUrls(selfiePaths, 'selfie')
      },
      proofOfAddress: {
        address1: verification.address_line_1,
        address2: verification.address_line_2,
        city: verification.city,
        state: verification.state,
        zipCode: verification.postal_code,
        country: verification.address_country,
        proofConcent: verification.proof_of_address_consent,
        uploadedAddressProofs: await resolveAttachmentUrls(addressProofPaths, 'address_proof'),
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

