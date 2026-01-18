import { prisma } from '@services/prismaService';
import { ServiceResponse } from '@utils/ApiResponse';
import { ulid } from 'ulid';
import { getFileUrl, getRelativePath } from '@utils/General';

/**
 * CompanyProfileService
 * Handles all company/founder-specific profile operations
 */
export class CompanyProfileService {
  /**
   * Get company profile by user ID
   */
  static async getMyProfile(userId: number): Promise<ServiceResponse> {
    try {
      let profile = await prisma.companyProfile.findUnique({
        where: { user_id: userId },
        include: {
          user: {
            include: {
              currency: true,
            },
          },
          country: true,
          state: true,
          industry: true,
          subIndustry: true,
        },
      });

      // Auto-create profile if it doesn't exist
      if (!profile) {
        profile = await prisma.companyProfile.create({
          data: {
            user_id: userId,
            unique_id: ulid(),
          },
          include: {
            user: {
              include: {
                currency: true,
              },
            },
            country: true,
            state: true,
            industry: true,
            subIndustry: true,
          },
        });
      }

      // Transform data for response
      const companyDetail = {
        id: profile.id,
        unique_id: profile.unique_id,
        profile_type: 'founder',
        profileImage: profile.profileImage ? getFileUrl(profile.profileImage) : null,
        coverImage: profile.coverImage ? getFileUrl(profile.coverImage) : null,
        
        // Company info
        company_name: profile.company_name,
        company_description: profile.company_description,
        company_website: profile.company_website,
        company_size: profile.company_size,
        founded_year: profile.founded_year,
        industry_id: profile.industry_id,
        sub_industry_id: profile.sub_industry_id,
        industry: profile.industry,
        subIndustry: profile.subIndustry,
        company_stage: profile.company_stage,
        team_size: profile.team_size,
        
        // Business model
        revenue_model: profile.revenue_model,
        target_market: profile.target_market,
        problem_statement: profile.problem_statement,
        solution_statement: profile.solution_statement,
        
        // Funding
        funding_status: profile.funding_status,
        total_funding: profile.total_funding,
        
        // Location
        address: profile.address,
        address_line_2: profile.address_line_2,
        city: profile.city,
        zipCode: profile.zipCode,
        
        // Social links
        links: profile.links,
        
        // Relations
        country: profile.country,
        state: profile.state,
        currency: profile.user.currency,
        
        // User data
        firstName: profile.user.first_name,
        lastName: profile.user.last_name,
        email: profile.user.email,
        phone: profile.user.phone,
        emailVerified: !!profile.user.email_verified_at,
        phoneVerified: !!profile.user.phone_verified_at,
      };

      return {
        success: true,
        message: 'Company profile retrieved successfully',
        data: companyDetail,
      };
    } catch (error: any) {
      console.error('Get Company Profile Error:', error);
      return {
        success: false,
        message: 'Failed to retrieve company profile',
      };
    }
  }

  /**
   * Upload profile image
   */
  static async uploadProfileImage(userId: number, file: any): Promise<ServiceResponse> {
    try {
      const relativePath = getRelativePath(file.path);

      const profile = await prisma.companyProfile.upsert({
        where: { user_id: userId },
        update: { profileImage: relativePath },
        create: {
          user_id: userId,
          unique_id: ulid(),
          profileImage: relativePath,
        },
      });

      return {
        success: true,
        message: 'Profile image uploaded successfully',
        data: {
          profileImage: getFileUrl(relativePath),
        },
      };
    } catch (error: any) {
      console.error('Upload Profile Image Error:', error);
      return {
        success: false,
        message: 'Failed to upload profile image',
      };
    }
  }

  /**
   * Upload cover image
   */
  static async uploadCoverImage(userId: number, file: any): Promise<ServiceResponse> {
    try {
      const relativePath = getRelativePath(file.path);

      const profile = await prisma.companyProfile.upsert({
        where: { user_id: userId },
        update: { coverImage: relativePath },
        create: {
          user_id: userId,
          unique_id: ulid(),
          coverImage: relativePath,
        },
      });

      return {
        success: true,
        message: 'Cover image uploaded successfully',
        data: {
          coverImage: getFileUrl(relativePath),
        },
      };
    } catch (error: any) {
      console.error('Upload Cover Image Error:', error);
      return {
        success: false,
        message: 'Failed to upload cover image',
      };
    }
  }

  /**
   * Update company overview (includes company info and location)
   */
  static async updateOverview(userId: number, data: {
    company_name?: string;
    company_description?: string;
    company_website?: string;
    founded_year?: number;
    company_size?: string;
    address?: string;
    address_line_2?: string;
    city?: string;
    zipCode?: string;
    country_id?: number;
    state_id?: number;
  }): Promise<ServiceResponse> {
    try {
      const profile = await prisma.companyProfile.upsert({
        where: { user_id: userId },
        update: data,
        create: {
          user_id: userId,
          unique_id: ulid(),
          ...data,
        },
        include: {
          user: {
            include: {
              currency: true,
            },
          },
          country: true,
          state: true,
        },
      });

      return {
        success: true,
        message: 'Company overview updated successfully',
        data: profile,
      };
    } catch (error: any) {
      console.error('Update Company Overview Error:', error);
      return {
        success: false,
        message: 'Failed to update company overview',
      };
    }
  }

  /**
   * Update company details (location, size, stage, etc.)
   */
  static async updateDetails(userId: number, data: {
    company_size?: string;
    company_stage?: string;
    team_size?: number;
    address?: string;
    city?: string;
    zipCode?: string;
    country_id?: number;
    state_id?: number;
    industry_id?: number;
    sub_industry_id?: number;
  }): Promise<ServiceResponse> {
    try {
      const profile = await prisma.companyProfile.upsert({
        where: { user_id: userId },
        update: data,
        create: {
          user_id: userId,
          unique_id: ulid(),
          ...data,
        },
        include: {
          user: {
            include: {
              currency: true,
            },
          },
          country: true,
          state: true,
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
  static async updateFunding(userId: number, data: {
    funding_status?: string;
    total_funding?: number;
  }): Promise<ServiceResponse> {
    try {
      const profile = await prisma.companyProfile.upsert({
        where: { user_id: userId },
        update: data,
        create: {
          user_id: userId,
          unique_id: ulid(),
          ...data,
        },
        include: {
          user: {
            include: {
              currency: true,
            },
          },
          country: true,
          state: true,
        },
      });

      return {
        success: true,
        message: 'Funding information updated successfully',
        data: profile,
      };
    } catch (error: any) {
      console.error('Update Funding Error:', error);
      return {
        success: false,
        message: 'Failed to update funding information',
      };
    }
  }

  /**
   * Update problem and solution statements
   */
  static async updateProblemSolution(userId: number, data: {
    problem_statement?: string;
    solution_statement?: string;
  }): Promise<ServiceResponse> {
    try {
      const profile = await prisma.companyProfile.upsert({
        where: { user_id: userId },
        update: data,
        create: {
          user_id: userId,
          unique_id: ulid(),
          ...data,
        },
        include: {
          user: {
            include: {
              currency: true,
            },
          },
          country: true,
          state: true,
        },
      });

      return {
        success: true,
        message: 'Problem and solution updated successfully',
        data: profile,
      };
    } catch (error: any) {
      console.error('Update Problem Solution Error:', error);
      return {
        success: false,
        message: 'Failed to update problem and solution',
      };
    }
  }

  /**
   * Update target market
   */
  static async updateTargetMarket(userId: number, data: {
    target_market?: string;
  }): Promise<ServiceResponse> {
    try {
      const profile = await prisma.companyProfile.upsert({
        where: { user_id: userId },
        update: data,
        create: {
          user_id: userId,
          unique_id: ulid(),
          ...data,
        },
        include: {
          user: {
            include: {
              currency: true,
            },
          },
          country: true,
          state: true,
        },
      });

      return {
        success: true,
        message: 'Target market updated successfully',
        data: profile,
      };
    } catch (error: any) {
      console.error('Update Target Market Error:', error);
      return {
        success: false,
        message: 'Failed to update target market',
      };
    }
  }

  /**
   * Update revenue model
   */
  static async updateRevenueModel(userId: number, data: {
    revenue_model?: string;
  }): Promise<ServiceResponse> {
    try {
      const profile = await prisma.companyProfile.upsert({
        where: { user_id: userId },
        update: data,
        create: {
          user_id: userId,
          unique_id: ulid(),
          ...data,
        },
        include: {
          user: {
            include: {
              currency: true,
            },
          },
          country: true,
          state: true,
        },
      });

      return {
        success: true,
        message: 'Revenue model updated successfully',
        data: profile,
      };
    } catch (error: any) {
      console.error('Update Revenue Model Error:', error);
      return {
        success: false,
        message: 'Failed to update revenue model',
      };
    }
  }
}
