import { prisma } from "../../services/prismaService";
import { Log } from '@services/loggerService';

interface ServiceResponse {
  success: boolean;
  message: string;
  data?: any;
}

export class RaisingFundService {
  /**
   * Get or create raising fund status
   */
  static async getRaisingFund(userId: number): Promise<ServiceResponse> {
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

      let raisingFund = await prisma.raisingFund.findUnique({
        where: { company_profile_id: profile.id }
      });

      // Create default if doesn't exist
      if (!raisingFund) {
        raisingFund = await prisma.raisingFund.create({
          data: {
            company_profile_id: profile.id,
            is_raising: false
          }
        });
      }

      return {
        success: true,
        message: 'Raising fund status retrieved successfully',
        data: raisingFund
      };
    } catch (error: any) {
      Log.error("Error", { error });
      return {
        success: false,
        message: 'Failed to retrieve raising fund status'
      };
    }
  }

  /**
   * Update raising fund status
   */
  static async updateRaisingFund(userId: number, data: {
    is_raising: boolean;
    round_type?: string;
    target_amount?: number;
    uses_of_fund?: any;
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

      const raisingFund = await prisma.raisingFund.upsert({
        where: { company_profile_id: profile.id },
        update: data,
        create: {
          company_profile_id: profile.id,
          ...data
        }
      });

      return {
        success: true,
        message: 'Raising fund status updated successfully',
        data: raisingFund
      };
    } catch (error: any) {
      Log.error("Error", { error });
      return {
        success: false,
        message: 'Failed to update raising fund status'
      };
    }
  }
}
