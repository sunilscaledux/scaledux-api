import { prisma } from "@services/prismaService";
import { ServiceResponse } from "@utils/ApiResponse";
import { getRelativePath, getFileUrl, extractRelativePath } from '@utils/General';
import TwilioService from "@services/TwilioService";
import fs from 'fs';
import path from 'path';

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
      console.error("Get Agency Verification Status Error:", error);
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
          documents: documents || [],
          status: 'PENDING'
        }
      });

      return {
        success: true,
        message: "Agency verification submitted successfully",
        data: agencyVerification
      };
    } catch (error: any) {
      console.error("Submit Agency Verification Error:", error);
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

      const uploadedFiles = files.map((file: Express.Multer.File) => {
        const relativePath = getRelativePath(file.path);
        return {
          url: relativePath,
          fullUrl: getFileUrl(relativePath),
          name: file.originalname,
          size: file.size
        };
      });

      return {
        success: true,
        message: "Agency documents uploaded successfully",
        data: uploadedFiles
      };
    } catch (error: any) {
      console.error("Upload Agency Documents Error:", error);
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
          emailVerified: true,
          emailVerifiedAt: true
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
          isVerified: user.emailVerified || false,
          verifiedAt: user.emailVerifiedAt
        }
      };
    } catch (error: any) {
      console.error("Get Email Verification Status Error:", error);
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
        select: { emailVerified: true }
      });

      if (user?.emailVerified) {
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
      console.log(`Email OTP for ${email}: ${otp}`);

      return {
        success: true,
        message: "OTP sent to email successfully",
        data: { email }
      };
    } catch (error: any) {
      console.error("Send Email OTP Error:", error);
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
          emailVerified: true,
          emailVerifiedAt: new Date()
        }
      });

      return {
        success: true,
        message: "Email verified successfully",
        data: {
          email: user.email,
          isVerified: true,
          verifiedAt: user.emailVerifiedAt
        }
      };
    } catch (error: any) {
      console.error("Verify Email OTP Error:", error);
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
        select: { phoneVerified: true }
      });

      if (user?.phoneVerified) {
        return {
          success: false,
          message: "Phone number is already verified"
        };
      }

      // Use Twilio service to send OTP
      const result = await TwilioService.sendOTP(phone);
      
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
      console.error("Send Phone OTP Error:", error);
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
      const result = await TwilioService.verifyOTP(user.phone, otp);
      
      if (result.success) {
        // Update user phone verification status
        const updatedUser = await prisma.user.update({
          where: { id: userId },
          data: {
            phoneVerified: true,
            phoneVerifiedAt: new Date()
          }
        });

        return {
          success: true,
          message: "Phone number verified successfully",
          data: {
            phone: updatedUser.phone,
            isVerified: true,
            verifiedAt: updatedUser.phoneVerifiedAt
          }
        };
      } else {
        return {
          success: false,
          message: result.message || "Invalid OTP"
        };
      }
    } catch (error: any) {
      console.error("Verify Phone OTP Error:", error);
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
          verifiedAt: identityVerification.verified_at,
          rejectionReason: identityVerification.rejection_reason
        }
      };
    } catch (error: any) {
      console.error("Get Identity Verification Status Error:", error);
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
          document_type: data.documentType,
          document_number: data.documentNumber,
          full_name: data.fullName,
          date_of_birth: new Date(data.dateOfBirth),
          address: data.address,
          id_images: data.idImages || [],
          selfie_images: data.selfieImages || [],
          address_proof: data.addressProof || [],
          status: 'PENDING'
        }
      });

      return {
        success: true,
        message: "Identity verification submitted successfully",
        data: identityVerification
      };
    } catch (error: any) {
      console.error("Submit Identity Verification Error:", error);
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

      const uploadedFiles = files.map((file: Express.Multer.File) => {
        const relativePath = getRelativePath(file.path);
        return {
          url: relativePath,
          fullUrl: getFileUrl(relativePath),
          name: file.originalname,
          type: documentType,
          size: file.size
        };
      });

      return {
        success: true,
        message: `${documentType} uploaded successfully`,
        data: uploadedFiles
      };
    } catch (error: any) {
      console.error("Upload Verification Documents Error:", error);
      return {
        success: false,
        message: "Failed to upload verification documents"
      };
    }
  }

  /**
   * Delete verification document
   */
  static async deleteVerificationDocument(userId: number, filePath: string): Promise<ServiceResponse> {
    try {
      if (!filePath) {
        return {
          success: false,
          message: "File path is required"
        };
      }

      // Extract relative path and construct full path
      const relativePath = extractRelativePath(filePath);
      const fullPath = path.join(process.cwd(), "uploads", relativePath);

      // Check if file exists and delete it
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }

      return {
        success: true,
        message: "Document deleted successfully",
        data: null
      };
    } catch (error: any) {
      console.error("Delete Verification Document Error:", error);
      return {
        success: false,
        message: "Failed to delete document"
      };
    }
  }
}
