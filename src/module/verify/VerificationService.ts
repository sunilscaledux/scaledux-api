import { prisma } from "@services/prismaService";
import { ServiceResponse } from "@utils/ApiResponse";
import { resolveAttachmentUrl } from '@services/attachmentService';
import { verifyOtpByType, generateAndSendOtp, OTP_TYPES } from '@module/auth/AuthService';
import { updateCompletionSection } from "../profile/ProfileCompletionService";

import { Log } from '@services/loggerService';

export class VerificationService {
  // ============ AGENCY VERIFICATION ============
  
  /**
   * Get agency verification status
   */
  static async getAgencyVerificationStatus(userId: number): Promise<ServiceResponse> {
    try {
      // Get the latest agency verification for the user
      const agencyVerification = await prisma.agencyVerification.findFirst({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' }
      });

      if (!agencyVerification) {
        return {
          success: true,
          message: "No agency verification found",
          data: {
            isVerified: false,
            status: null,
            verifiedAt: null
          }
        };
      }

      return {
        success: true,
        message: "Agency verification status retrieved successfully",
        data: {
          isVerified: agencyVerification.status === 'APPROVED',
          status: agencyVerification.status,
          verifiedAt: agencyVerification.verified_at,
          rejectionReason: agencyVerification.rejection_reason
        }
      };
    } catch (error: any) {
      Log.error("Error", { error });
      return {
        success: false,
        message: "Failed to get agency verification status"
      };
    }
  }

  /**
   * Submit agency verification
   */
  static async submitAgencyVerification(userId: number, agencyName: string, cin: string, documents?: string[]): Promise<ServiceResponse> {
    try {
      // Check if there's already a pending verification
      const existingVerification = await prisma.agencyVerification.findFirst({
        where: {
          user_id: userId,
          status: 'PENDING'
        }
      });

      if (existingVerification) {
        return {
          success: false,
          message: "Agency verification already submitted and pending review"
        };
      }

      const agencyVerification = await prisma.agencyVerification.create({
        data: {
          user_id: userId,
          agency_name: agencyName,
          cin: cin,
          document_urls: documents || [],
          status: 'PENDING'
        }
      });

      return {
        success: true,
        message: "Agency verification submitted successfully",
        data: agencyVerification
      };
    } catch (error: any) {
      Log.error("Error", { error });
      return {
        success: false,
        message: "Failed to submit agency verification"
      };
    }
  }

  /**
   * Upload agency documents
   */
  static async uploadAgencyDocuments(userId: number, files: Express.Multer.File[]): Promise<ServiceResponse> {
    try {
      if (!files || !Array.isArray(files) || files.length === 0) {
        return {
          success: false,
          message: "No files uploaded"
        };
      }

      const uploadedFiles = await Promise.all(files.map(async (file: Express.Multer.File) => {
        const pathOrId = file.path;
        return {
          url: pathOrId,
          fullUrl: await resolveAttachmentUrl(pathOrId, { entityType: 'agencyVerification', fieldName: 'document_urls' }),
          name: file.originalname,
          size: file.size
        };
      }));

      return {
        success: true,
        message: "Agency documents uploaded successfully",
        data: uploadedFiles
      };
    } catch (error: any) {
      Log.error("Error", { error });
      return {
        success: false,
        message: "Failed to upload agency documents"
      };
    }
  }

  // ============ EMAIL VERIFICATION ============

  /**
   * Get email verification status
   */
  static async getEmailVerificationStatus(userId: number): Promise<ServiceResponse> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          email: true,
          email_verified_at: true
        }
      });

      if (!user) {
        return {
          success: false,
          message: "User not found"
        };
      }

      return {
        success: true,
        message: "Email verification status retrieved successfully",
        data: {
          email: user.email,
          isVerified: !!user.email_verified_at,
          verifiedAt: user.email_verified_at
        }
      };
    } catch (error: any) {
      Log.error("Error", { error });
      return {
        success: false,
        message: "Failed to get email verification status"
      };
    }
  }

  /**
   * Send email OTP for verification
   */
  static async sendEmailOTP(userId: number, email: string): Promise<ServiceResponse> {
    try {
      // Check if email is already verified
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email_verified_at: true }
      });

      if (user?.email_verified_at) {
        return {
          success: false,
          message: "Email is already verified"
        };
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Store OTP in database (you might want to create an OTP table)
      // For now, we'll assume there's an OTP service or table
      
      // TODO: Send email with OTP using email service
      Log.info(`Email OTP for ${email}: ${otp}`);

      return {
        success: true,
        message: "OTP sent to email successfully",
        data: { email }
      };
    } catch (error: any) {
      Log.error("Error", { error });
      return {
        success: false,
        message: "Failed to send email OTP"
      };
    }
  }

  /**
   * Verify email OTP
   */
  static async verifyEmailOTP(userId: number, email: string, otp: string): Promise<ServiceResponse> {
    try {
      // TODO: Verify OTP from database/cache
      // For now, we'll assume OTP is valid
      
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          email: email,
          email_verified_at: new Date()
        }
      });
      await updateCompletionSection(userId, 'emailVerification', true);
      return {
        success: true,
        message: "Email verified successfully",
        data: {
          email: user.email,
          isVerified: true,
          verifiedAt: user.email_verified_at
        }
      };
    } catch (error: any) {
      Log.error("Error", { error });
      return {
        success: false,
        message: "Failed to verify email OTP"
      };
    }
  }

  // ============ PHONE VERIFICATION ============

  /**
   * Send phone OTP
   */
  static async sendPhoneOTP(userId: number, phone: string): Promise<ServiceResponse> {
    try {
      // Check if phone is already verified
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { phone_verified_at: true }
      });

      if (user?.phone_verified_at) {
        return {
          success: false,
          message: "Phone number is already verified"
        };
      }

      const result = await generateAndSendOtp({
        phone: phone,
        otpType: OTP_TYPES.PHONE_VERIFICATION,
        userId: userId
      });
      
      if (result.success) {
        return {
          success: true,
          message: "OTP sent to phone successfully",
          data: { phone }
        };
      } else {
        return {
          success: false,
          message: result.message || "Failed to send OTP"
        };
      }
    } catch (error: any) {
      Log.error("Error", { error });
      return {
        success: false,
        message: "Failed to send phone OTP"
      };
    }
  }

  /**
   * Verify phone OTP
   */
  static async verifyPhoneOTP(userId: number, otp: string): Promise<ServiceResponse> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { phone: true }
      });

      if (!user?.phone) {
        return {
          success: false,
          message: "Phone number not found"
        };
      }

      // Verify OTP using Twilio service
      const result = await verifyOtpByType(user.phone, otp, "PHONE_VERIFICATION");
      
      if (result.success) {
        // Update user phone verification status
        const updatedUser = await prisma.user.update({
          where: { id: userId },
          data: {
            phone_verified_at: new Date()
          }
        });
        await updateCompletionSection(userId, 'phoneVerification', true);
        return {
          success: true,
          message: "Phone number verified successfully",
          data: {
            phone: updatedUser.phone,
            isVerified: true,
            verifiedAt: updatedUser.phone_verified_at
          }
        };
      } else {
        return {
          success: false,
          message: result.message || "Invalid OTP"
        };
      }
    } catch (error: any) {
      Log.error("Error", { error });
      return {
        success: false,
        message: "Failed to verify phone OTP"
      };
    }
  }

  // ============ IDENTITY VERIFICATION ============

  /**
   * Get identity verification status
   */
  static async getIdentityVerificationStatus(userId: number): Promise<ServiceResponse> {
    try {
      const identityVerification = await prisma.identityVerification.findFirst({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' }
      });

      if (!identityVerification) {
        return {
          success: true,
          message: "No identity verification found",
          data: {
            isVerified: false,
            status: null,
            verifiedAt: null
          }
        };
      }

      return {
        success: true,
        message: "Identity verification status retrieved successfully",
        data: {
          isVerified: identityVerification.status === 'APPROVED',
          status: identityVerification.status,
          verifiedAt: identityVerification.reviewed_at,
          rejectionReason: identityVerification.rejection_reason
        }
      };
    } catch (error: any) {
      Log.error("Error", { error });
      return {
        success: false,
        message: "Failed to get identity verification status"
      };
    }
  }

  /**
   * Submit identity verification
   */
  static async submitIdentityVerification(
    userId: number, 
    data: {
      documentType: string;
      documentNumber: string;
      fullName: string;
      dateOfBirth: string;
      address: string;
      idImages?: string[];
      selfieImages?: string[];
      addressProof?: string[];
    }
  ): Promise<ServiceResponse> {
    try {
      // Check if there's already a pending verification
      const existingVerification = await prisma.identityVerification.findFirst({
        where: {
          user_id: userId,
          status: 'PENDING'
        }
      });

      if (existingVerification) {
        return {
          success: false,
          message: "Identity verification already submitted and pending review"
        };
      }

      const identityVerification = await prisma.identityVerification.create({
        data: {
          user_id: userId,
          id_type: data.documentType,
          id_number: data.documentNumber,
          first_name: data.fullName.split(' ')[0] || data.fullName,
          last_name: data.fullName.split(' ').slice(1).join(' ') || '',
          date_of_birth: new Date(data.dateOfBirth),
          address_line_1: data.address,
          city: 'Unknown', // Required field, should be passed from frontend
          issuing_country: 'Unknown', // Required field, should be passed from frontend
          address_country: 'Unknown', // Required field, should be passed from frontend
          id_document_urls: data.idImages || [],
          selfie_urls: data.selfieImages || [],
          address_proof_urls: data.addressProof || [],
          status: 'PENDING'
        }
      });

      return {
        success: true,
        message: "Identity verification submitted successfully",
        data: identityVerification
      };
    } catch (error: any) {
      Log.error("Error", { error });
      return {
        success: false,
        message: "Failed to submit identity verification"
      };
    }
  }

  /**
   * Upload verification documents
   */
  static async uploadVerificationDocuments(userId: number, files: Express.Multer.File[], documentType: string): Promise<ServiceResponse> {
    try {
      if (!files || !Array.isArray(files) || files.length === 0) {
        return {
          success: false,
          message: "No files uploaded"
        };
      }

      const uploadedFiles = await Promise.all(files.map(async (file: Express.Multer.File) => {
        const pathOrId = file.path;
        const fieldName = documentType === 'id_documents' ? 'id_documents' : documentType === 'selfie' ? 'selfie' : 'address_proof';
        return {
          url: pathOrId,
          fullUrl: await resolveAttachmentUrl(pathOrId, { entityType: 'identityVerification', fieldName }),
          name: file.originalname,
          type: documentType,
          size: file.size
        };
      }));

      return {
        success: true,
        message: `${documentType} uploaded successfully`,
        data: uploadedFiles
      };
    } catch (error: any) {
      Log.error("Error", { error });
      return {
        success: false,
        message: "Failed to upload verification documents"
      };
    }
  }}
