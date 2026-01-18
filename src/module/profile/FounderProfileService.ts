import { prisma } from '@services/prismaService';
import { ServiceResponse } from '@utils/ApiResponse';
import { getFileUrl, getRelativePath } from '@utils/General';
import { ulid } from 'ulid';
import { FounderProfileInput } from './ProfileType';

/**
 * FounderProfileService
 * Handles all founder/company-specific profile operations
 */
export class FounderProfileService {
  /**
   * Get founder profile by user ID
   */
  static async getProfileByUserId(userId: number): Promise<ServiceResponse> {
    try {
      const profile = await prisma.userProfile.findUnique({
        where: {
          user_id_profile_type: {
            user_id: userId,
            profile_type: 'founder'
          }
        },
        include: {
          country: true,
          state: true,
          currency: true,
        },
      });

      if (!profile || profile.profile_type !== 'founder') {
        return {
          success: false,
          message: 'Founder profile not found',
        };
      }

      return {
        success: true,
        message: 'Founder profile retrieved successfully',
        data: profile,
      };
    } catch (error: any) {
      console.error('Get Founder Profile Error:', error);
      return {
        success: false,
        message: 'Failed to retrieve founder profile',
      };
    }
  }

  /**
   * Update founder profile
   */
  static async updateFounderProfile(userId: number, data: Partial<FounderProfileInput>): Promise<ServiceResponse> {
    try {
      const profile = await prisma.userProfile.upsert({
        where: {
          user_id_profile_type: {
            user_id: userId,
            profile_type: 'founder'
          }
        },
        update: data,
        create: {
          user_id: userId,
          unique_id: ulid(),
          profile_type: 'founder',
          ...data,
        },
        include: {
          country: true,
          state: true,
          currency: true,
        },
      });

      return {
        success: true,
        message: 'Founder profile updated successfully',
        data: profile,
      };
    } catch (error: any) {
      console.error('Update Founder Profile Error:', error);
      return {
        success: false,
        message: 'Failed to update founder profile',
      };
    }
  }

  /**
   * Upload company logo
   */
  static async uploadCompanyLogo(userId: number, file: any): Promise<ServiceResponse> {
    try {
      const relativePath = getRelativePath(file.path);

      const profile = await prisma.userProfile.upsert({
        where: {
          user_id_profile_type: {
            user_id: userId,
            profile_type: 'founder'
          }
        },
        update: {
          company_logo: relativePath,
        },
        create: {
          user_id: userId,
          unique_id: ulid(),
          profile_type: 'founder',
          company_logo: relativePath,
        },
      });

      return {
        success: true,
        message: 'Company logo uploaded successfully',
        data: {
          company_logo: getFileUrl(relativePath),
        },
      };
    } catch (error: any) {
      console.error('Upload Company Logo Error:', error);
      return {
        success: false,
        message: 'Failed to upload company logo',
      };
    }
  }

  /**
   * Upload company cover image
   */
  static async uploadCompanyCover(userId: number, file: any): Promise<ServiceResponse> {
    try {
      const relativePath = getRelativePath(file.path);

      const profile = await prisma.userProfile.upsert({
        where: {
          user_id_profile_type: {
            user_id: userId,
            profile_type: 'founder'
          }
        },
        update: {
          company_cover_image: relativePath,
        },
        create: {
          user_id: userId,
          unique_id: ulid(),
          profile_type: 'founder',
          company_cover_image: relativePath,
        },
      });

      return {
        success: true,
        message: 'Company cover image uploaded successfully',
        data: {
          company_cover_image: getFileUrl(relativePath),
        },
      };
    } catch (error: any) {
      console.error('Upload Company Cover Error:', error);
      return {
        success: false,
        message: 'Failed to upload company cover image',
      };
    }
  }

  /**
   * Update company details
   */
  static async updateCompanyDetails(userId: number, data: Partial<FounderProfileInput>): Promise<ServiceResponse> {
    try {
      const profile = await prisma.userProfile.upsert({
        where: {
          user_id_profile_type: {
            user_id: userId,
            profile_type: 'founder'
          }
        },
        update: {
          company_name: data.company_name,
          company_tagline: data.company_tagline,
          year_founded: data.year_founded,
          company_size: data.company_size,
          headquarters: data.headquarters,
          company_location: data.company_location,
          company_website: data.company_website,
          industry: data.industry,
          company_type: data.company_type,
          description: data.description,
          problem_statement: data.problem_statement,
          solution: data.solution,
          target_market: data.target_market,
          unique_value_prop: data.unique_value_prop,
          business_model: data.business_model,
          revenue_model: data.revenue_model,
        },
        create: {
          user_id: userId,
          unique_id: ulid(),
          profile_type: 'founder',
          company_name: data.company_name,
          company_tagline: data.company_tagline,
          year_founded: data.year_founded,
          company_size: data.company_size,
          headquarters: data.headquarters,
          company_location: data.company_location,
          company_website: data.company_website,
          industry: data.industry,
          company_type: data.company_type,
          description: data.description,
          problem_statement: data.problem_statement,
          solution: data.solution,
          target_market: data.target_market,
          unique_value_prop: data.unique_value_prop,
          business_model: data.business_model,
          revenue_model: data.revenue_model,
        },
        include: {
          country: true,
          state: true,
          currency: true,
        },
      });

      return {
        success: true,
        message: 'Company details updated successfully',
        data: profile,
      };
    } catch (error: any) {
      console.error('Update Company Details Error:', error);
      return {
        success: false,
        message: 'Failed to update company details',
      };
    }
  }

  /**
   * Update funding information
   */
  static async updateFundingInfo(userId: number, data: Partial<FounderProfileInput>): Promise<ServiceResponse> {
    try {
      const profile = await prisma.userProfile.upsert({
        where: {
          user_id_profile_type: {
            user_id: userId,
            profile_type: 'founder'
          }
        },
        update: {
          funding_stage: data.funding_stage,
          total_funding: data.total_funding,
          seeking_funding: data.seeking_funding,
          funding_amount: data.funding_amount,
        },
        create: {
          user_id: userId,
          unique_id: ulid(),
          profile_type: 'founder',
          funding_stage: data.funding_stage,
          total_funding: data.total_funding,
          seeking_funding: data.seeking_funding,
          funding_amount: data.funding_amount,
        },
        include: {
          currency: true,
        },
      });

      return {
        success: true,
        message: 'Funding information updated successfully',
        data: profile,
      };
    } catch (error: any) {
      console.error('Update Funding Info Error:', error);
      return {
        success: false,
        message: 'Failed to update funding information',
      };
    }
  }
}
