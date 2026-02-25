import { prisma } from "@services/prismaService";
import { CreateLicenseInput, UpdateLicenseInput } from "./LicenseType";
import { ServiceResponse } from "@utils/ApiResponse";
import { updateCompletionSection } from "../profile/ProfileCompletionService";

export class LicenseService {
  /**
   * Get all licenses for a user
   */
  static async getLicenses(userId: number): Promise<ServiceResponse> {
    try {
      const licenses = await prisma.license.findMany({
        where: {
          user_id: userId
        },
        orderBy: {
          created_at: 'desc'
        }
      });

      return {
        success: true,
        message: 'Licenses retrieved successfully',
        data: licenses
      };
    } catch (error) {
      console.error('Error fetching licenses:', error);
      return {
        success: false,
        message: 'Internal server error'
      };
    }
  }

  /**
   * Create a new license
   */
  static async createLicense(userId: number, licenseData: CreateLicenseInput): Promise<ServiceResponse> {
    try {
      const newLicense = await prisma.license.create({
        data: {
          user_id: userId,
          institute: licenseData.institute,
          license_name: licenseData.license_name,
          completed_month: licenseData.completed_month,
          completed_year: licenseData.completed_year,
          description: licenseData.description,
          skills: licenseData.skills || []
        }
      });
      await updateCompletionSection(userId, 'licenseCertifications', true);
      return {
        success: true,
        message: 'License created successfully',
        data: newLicense
      };
    } catch (error) {
      console.error('Error creating license:', error);
      return {
        success: false,
        message: 'Internal server error'
      };
    }
  }

  /**
   * Update a license
   */
  static async updateLicense(userId: number, licenseData: UpdateLicenseInput): Promise<ServiceResponse> {
    try {
      // Check if license exists and belongs to user
      const existingLicense = await prisma.license.findFirst({
        where: {
          id: licenseData.id,
          user_id: userId
        }
      });

      if (!existingLicense) {
        return {
          success: false,
          message: 'License not found'
        };
      }

      const updatedLicense = await prisma.license.update({
        where: {
          id: licenseData.id
        },
        data: {
          institute: licenseData.institute,
          license_name: licenseData.license_name,
          completed_month: licenseData.completed_month,
          completed_year: licenseData.completed_year,
          description: licenseData.description,
          skills: licenseData.skills || []
        }
      });

      return {
        success: true,
        message: 'License updated successfully',
        data: updatedLicense
      };
    } catch (error) {
      console.error('Error updating license:', error);
      return {
        success: false,
        message: 'Internal server error'
      };
    }
  }

  /**
   * Delete a license
   */
  static async deleteLicense(userId: number, licenseId: number): Promise<ServiceResponse> {
    try {
      // Check if license exists and belongs to user
      const existingLicense = await prisma.license.findFirst({
        where: {
          id: licenseId,
          user_id: userId
        }
      });

      if (!existingLicense) {
        return {
          success: false,
          message: 'License not found'
        };
      }

      await prisma.license.delete({
        where: {
          id: licenseId
        }
      });
      const remaining = await prisma.license.count({ where: { user_id: userId } });
      await updateCompletionSection(userId, 'licenseCertifications', remaining > 0);
      return {
        success: true,
        message: 'License deleted successfully',
        data: null
      };
    } catch (error) {
      console.error('Error deleting license:', error);
      return {
        success: false,
        message: 'Internal server error'
      };
    }
  }
}
