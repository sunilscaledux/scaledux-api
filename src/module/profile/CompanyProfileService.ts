import { prisma } from '@services/prismaService';
import { ServiceResponse } from '@utils/ApiResponse';
import { ulid } from 'ulid';

/**
 * CompanyProfileService
 * Handles all company/founder-specific profile operations
 */
export class CompanyProfileService {
  /**
   * Update company overview (company name, description, etc.)
   */
  static async updateOverview(userId: number, data: {
    company_name?: string;
    company_description?: string;
    industry?: string;
    company_website?: string;
    founded_year?: number;
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
