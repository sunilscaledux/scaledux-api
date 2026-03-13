import { prisma } from "../../services/prismaService";
import { Log } from '@services/loggerService';

interface ServiceResponse {
  success: boolean;
  message: string;
  data?: any;
}

export class FundingRoundService {
  /**
   * Get all funding rounds for a company
   */
  static async getFundingRounds(userId: number): Promise<ServiceResponse> {
    try {
      const profile = await prisma.companyProfile.findUnique({
        where: { user_id: userId },
        select: { id: true }
      });

      if (!profile) {
        return {
          success: false,
          message: 'Company profile not found'
        };
      }

      const fundingRounds = await prisma.fundingRound.findMany({
        where: { 
          company_profile_id: profile.id,
          deleted_at: null
        },
        orderBy: { funding_date: 'desc' }
      });

      return {
        success: true,
        message: 'Funding rounds retrieved successfully',
        data: fundingRounds
      };
    } catch (error: any) {
      Log.error("Error", { error });
      return {
        success: false,
        message: 'Failed to retrieve funding rounds'
      };
    }
  }

  /**
   * Create a new funding round
   */
  static async createFundingRound(userId: number, data: {
    investor_name: string;
    funding_stage: string;
    funding_amount: number;
    funding_date: Date;
    funding_valuation?: number;
  }): Promise<ServiceResponse> {
    try {
      const profile = await prisma.companyProfile.findUnique({
        where: { user_id: userId },
        select: { id: true }
      });

      if (!profile) {
        return {
          success: false,
          message: 'Company profile not found'
        };
      }

      const fundingRound = await prisma.fundingRound.create({
        data: {
          company_profile_id: profile.id,
          investor_name: data.investor_name,
          funding_stage: data.funding_stage,
          funding_amount: data.funding_amount,
          funding_date: data.funding_date,
          funding_valuation: data.funding_valuation
        }
      });

      return {
        success: true,
        message: 'Funding round created successfully',
        data: fundingRound
      };
    } catch (error: any) {
      Log.error("Error", { error });
      return {
        success: false,
        message: 'Failed to create funding round'
      };
    }
  }

  /**
   * Update a funding round
   */
  static async updateFundingRound(userId: number, fundingRoundId: number, data: {
    investor_name?: string;
    funding_stage?: string;
    funding_amount?: number;
    funding_date?: Date;
    funding_valuation?: number;
  }): Promise<ServiceResponse> {
    try {
      // Verify ownership
      const profile = await prisma.companyProfile.findUnique({
        where: { user_id: userId },
        select: { id: true }
      });

      if (!profile) {
        return {
          success: false,
          message: 'Company profile not found'
        };
      }

      const existingRound = await prisma.fundingRound.findFirst({
        where: {
          id: fundingRoundId,
          company_profile_id: profile.id,
          deleted_at: null
        }
      });

      if (!existingRound) {
        return {
          success: false,
          message: 'Funding round not found or unauthorized'
        };
      }

      const fundingRound = await prisma.fundingRound.update({
        where: { id: fundingRoundId },
        data
      });

      return {
        success: true,
        message: 'Funding round updated successfully',
        data: fundingRound
      };
    } catch (error: any) {
      Log.error("Error", { error });
      return {
        success: false,
        message: 'Failed to update funding round'
      };
    }
  }

  /**
   * Delete a funding round
   */
  static async deleteFundingRound(userId: number, fundingRoundId: number): Promise<ServiceResponse> {
    try {
      // Verify ownership
      const profile = await prisma.companyProfile.findUnique({
        where: { user_id: userId },
        select: { id: true }
      });

      if (!profile) {
        return {
          success: false,
          message: 'Company profile not found'
        };
      }

      const existingRound = await prisma.fundingRound.findFirst({
        where: {
          id: fundingRoundId,
          company_profile_id: profile.id,
          deleted_at: null
        }
      });

      if (!existingRound) {
        return {
          success: false,
          message: 'Funding round not found or unauthorized'
        };
      }

      // Soft delete: set deleted_at timestamp
      await prisma.fundingRound.update({
        where: { id: fundingRoundId },
        data: { deleted_at: new Date() }
      });

      return {
        success: true,
        message: 'Funding round deleted successfully'
      };
    } catch (error: any) {
      Log.error("Error", { error });
      return {
        success: false,
        message: 'Failed to delete funding round'
      };
    }
  }
}
