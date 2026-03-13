import { prisma } from "@services/prismaService";
import { ServiceResponse } from "@utils/ApiResponse";
import { Log } from '@services/loggerService';

/**
 * Investment profile (one per user): single-value fields + related tables.
 * Used by GET/PATCH /profile/investment-profile.
 */
export class InvestmentProfileService {
  /**
   * Get investment profile for user; create empty one if not exists.
   */
  static async getOrCreate(userId: number): Promise<ServiceResponse> {
    try {
      let profile = await (prisma as any).investmentProfile.findUnique({
        where: { user_id: userId },
        include: {
          preferredIndustries: { include: { industry: true, subIndustry: true }, orderBy: { order_index: "asc" } },
          committeeMembers: { orderBy: { order_index: "asc" } },
          geoPreferences: { include: { country: true, state: true }, orderBy: { order_index: "asc" } },
        },
      });
      if (!profile) {
        profile = await (prisma as any).investmentProfile.create({
          data: { user_id: userId },
          include: {
            preferredIndustries: { include: { industry: true, subIndustry: true }, orderBy: { order_index: "asc" } },
            committeeMembers: { orderBy: { order_index: "asc" } },
            geoPreferences: { include: { country: true, state: true }, orderBy: { order_index: "asc" } },
          },
        });
      }
      const investorTypes = profile.investor_types;
      const data = {
        id: profile.id,
        unique_id: profile.unique_id,
        user_id: profile.user_id,
        investor_types: Array.isArray(investorTypes) ? investorTypes : null,
        thesis_summary: profile.thesis_summary,
        diligence_process: profile.diligence_process,
        diligence_document: profile.diligence_document,
        investment_size_min: profile.investment_size_min != null ? Number(profile.investment_size_min) : null,
        investment_size_max: profile.investment_size_max != null ? Number(profile.investment_size_max) : null,
        investment_size_currency: profile.investment_size_currency,
        equity_range_min: profile.equity_range_min,
        equity_range_max: profile.equity_range_max,
        preferred_industries: profile.preferredIndustries,
        committee_members: profile.committeeMembers,
        geo_preferences: profile.geoPreferences,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
      };
      return { success: true, message: "Investment profile retrieved", data };
    } catch (error: any) {
      Log.error("Error", { error });
      return { success: false, message: error.message || "Failed to get investment profile" };
    }
  }

  /**
   * Update investment profile main fields (partial).
   * preferred_industries: replace entire list (array of { industry_id, sub_industry_id?, specialisation?, investment_stage?, investment_criteria? }).
   */
  static async update(
    userId: number,
    data: {
      investor_types?: string[] | null;
      thesis_summary?: string | null;
      diligence_process?: string | null;
      diligence_document?: string | null;
      investment_size_min?: number | null;
      investment_size_max?: number | null;
      investment_size_currency?: string | null;
      equity_range_min?: number | null;
      equity_range_max?: number | null;
      preferred_industries?: Array<{
        industry_id: number;
        sub_industry_id?: number | null;
        specialisation?: string | null;
        investment_stage?: string | null;
        investment_criteria?: string | null;
      }>;
    }
  ): Promise<ServiceResponse> {
    try {
      let existing = await (prisma as any).investmentProfile.findUnique({ where: { user_id: userId } });
      if (!existing) {
        existing = await (prisma as any).investmentProfile.create({ data: { user_id: userId } });
      }
      const updatePayload: Record<string, unknown> = {};
      if (data.investor_types !== undefined) updatePayload.investor_types = Array.isArray(data.investor_types) ? data.investor_types : null;
      if (data.thesis_summary !== undefined) updatePayload.thesis_summary = data.thesis_summary;
      if (data.diligence_process !== undefined) updatePayload.diligence_process = data.diligence_process;
      if (data.diligence_document !== undefined) updatePayload.diligence_document = data.diligence_document;
      if (data.investment_size_min !== undefined) updatePayload.investment_size_min = data.investment_size_min;
      if (data.investment_size_max !== undefined) updatePayload.investment_size_max = data.investment_size_max;
      if (data.investment_size_currency !== undefined) updatePayload.investment_size_currency = data.investment_size_currency;
      if (data.equity_range_min !== undefined) updatePayload.equity_range_min = data.equity_range_min;
      if (data.equity_range_max !== undefined) updatePayload.equity_range_max = data.equity_range_max;

      const profileId = existing.id;

      if (data.preferred_industries !== undefined) {
        await (prisma as any).investmentProfilePreferredIndustry.deleteMany({ where: { investment_profile_id: profileId } });
        const list = Array.isArray(data.preferred_industries) ? data.preferred_industries : [];
        for (let i = 0; i < list.length; i++) {
          const item = list[i];
          if (item && typeof item.industry_id === "number") {
            await (prisma as any).investmentProfilePreferredIndustry.create({
              data: {
                investment_profile_id: profileId,
                industry_id: item.industry_id,
                sub_industry_id: item.sub_industry_id ?? null,
                specialisation: item.specialisation ?? null,
                investment_stage: item.investment_stage ?? null,
                investment_criteria: item.investment_criteria ?? null,
                order_index: i,
              },
            });
          }
        }
      }

      const profile = await (prisma as any).investmentProfile.update({
        where: { user_id: userId },
        data: updatePayload,
        include: {
          preferredIndustries: { include: { industry: true, subIndustry: true }, orderBy: { order_index: "asc" } },
          committeeMembers: { orderBy: { order_index: "asc" } },
          geoPreferences: { include: { country: true, state: true }, orderBy: { order_index: "asc" } },
        },
      });
      const investorTypes = profile.investor_types;
      const out = {
        id: profile.id,
        unique_id: profile.unique_id,
        user_id: profile.user_id,
        investor_types: Array.isArray(investorTypes) ? investorTypes : null,
        thesis_summary: profile.thesis_summary,
        diligence_process: profile.diligence_process,
        diligence_document: profile.diligence_document,
        investment_size_min: profile.investment_size_min != null ? Number(profile.investment_size_min) : null,
        investment_size_max: profile.investment_size_max != null ? Number(profile.investment_size_max) : null,
        investment_size_currency: profile.investment_size_currency,
        equity_range_min: profile.equity_range_min,
        equity_range_max: profile.equity_range_max,
        preferred_industries: profile.preferredIndustries,
        committee_members: profile.committeeMembers,
        geo_preferences: profile.geoPreferences,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
      };
      return { success: true, message: "Investment profile updated", data: out };
    } catch (error: any) {
      Log.error("Error", { error });
      return { success: false, message: error.message || "Failed to update investment profile" };
    }
  }
}
