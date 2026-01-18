import { prisma } from '@services/prismaService';
import { ServiceResponse } from '@utils/ApiResponse';
import { ulid } from 'ulid';
import { InvestorProfileInput } from './ProfileType';

/**
 * InvestorProfileService
 * Handles all investor-specific profile operations
 */
export class InvestorProfileService {
  /**
   * Get investor profile by user ID
   */
  static async getProfileByUserId(userId: number): Promise<ServiceResponse> {
    try {
      const profile = await prisma.userProfile.findUnique({
        where: {
          user_id_profile_type: {
            user_id: userId,
            profile_type: 'investor'
          }
        },
        include: {
          country: true,
          state: true,
          currency: true,
        },
      });

      if (!profile || profile.profile_type !== 'investor') {
        return {
          success: false,
          message: 'Investor profile not found',
        };
      }

      return {
        success: true,
        message: 'Investor profile retrieved successfully',
        data: profile,
      };
    } catch (error: any) {
      console.error('Get Investor Profile Error:', error);
      return {
        success: false,
        message: 'Failed to retrieve investor profile',
      };
    }
  }

  /**
   * Update investor profile
   */
  static async updateInvestorProfile(userId: number, data: Partial<InvestorProfileInput>): Promise<ServiceResponse> {
    try {
      const profile = await prisma.userProfile.upsert({
        where: {
          user_id_profile_type: {
            user_id: userId,
            profile_type: 'investor'
          }
        },
        update: data,
        create: {
          user_id: userId,
          unique_id: ulid(),
          profile_type: 'investor',
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
        message: 'Investor profile updated successfully',
        data: profile,
      };
    } catch (error: any) {
      console.error('Update Investor Profile Error:', error);
      return {
        success: false,
        message: 'Failed to update investor profile',
      };
    }
  }

  /**
   * Update investment preferences
   */
  static async updatePreferences(userId: number, data: Partial<InvestorProfileInput>): Promise<ServiceResponse> {
    try {
      const profile = await prisma.userProfile.upsert({
        where: {
          user_id_profile_type: {
            user_id: userId,
            profile_type: 'investor'
          }
        },
        update: {
          investment_focus: data.investment_focus,
          investment_stage: data.investment_stage,
        },
        create: {
          user_id: userId,
          unique_id: ulid(),
          profile_type: 'investor',
          investment_focus: data.investment_focus,
          investment_stage: data.investment_stage,
        },
      });

      return {
        success: true,
        message: 'Investment preferences updated successfully',
        data: profile,
      };
    } catch (error: any) {
      console.error('Update Preferences Error:', error);
      return {
        success: false,
        message: 'Failed to update investment preferences',
      };
    }
  }

  /**
   * Update ticket size range
   */
  static async updateTicketSize(
    userId: number,
    ticketSizeMin: number,
    ticketSizeMax: number
  ): Promise<ServiceResponse> {
    try {
      const profile = await prisma.userProfile.upsert({
        where: {
          user_id_profile_type: {
            user_id: userId,
            profile_type: 'investor'
          }
        },
        update: {
          ticket_size_min: ticketSizeMin,
          ticket_size_max: ticketSizeMax,
        },
        create: {
          user_id: userId,
          unique_id: ulid(),
          profile_type: 'investor',
          ticket_size_min: ticketSizeMin,
          ticket_size_max: ticketSizeMax,
        },
      });

      return {
        success: true,
        message: 'Ticket size range updated successfully',
        data: profile,
      };
    } catch (error: any) {
      console.error('Update Ticket Size Error:', error);
      return {
        success: false,
        message: 'Failed to update ticket size range',
      };
    }
  }

  /**
   * Update portfolio companies
   */
  static async updatePortfolio(userId: number, portfolioCompanies: string[]): Promise<ServiceResponse> {
    try {
      const profile = await prisma.userProfile.upsert({
        where: {
          user_id_profile_type: {
            user_id: userId,
            profile_type: 'investor'
          }
        },
        update: {
          portfolio_companies: portfolioCompanies,
        },
        create: {
          user_id: userId,
          unique_id: ulid(),
          profile_type: 'investor',
          portfolio_companies: portfolioCompanies,
        },
      });

      return {
        success: true,
        message: 'Portfolio companies updated successfully',
        data: profile,
      };
    } catch (error: any) {
      console.error('Update Portfolio Error:', error);
      return {
        success: false,
        message: 'Failed to update portfolio companies',
      };
    }
  }
}
