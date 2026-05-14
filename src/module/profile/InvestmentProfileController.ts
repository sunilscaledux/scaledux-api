import { Request, Response } from "express";
import { ApiResponse } from "@utils/ApiResponse";
import { InvestmentProfileService } from "./InvestmentProfileService";

/**
 * GET /api/v1/profile/investment-profile
 * Get current user's investment profile (create if not exists).
 */
export async function getInvestmentProfile(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return ApiResponse.error(res, "Unauthorized", 401);
    const result = await InvestmentProfileService.getOrCreate(userId);
    if (result.success) return ApiResponse.success(res, result.data, result.message);
    return ApiResponse.error(res, result.message);
  } catch (error: any) {
    return ApiResponse.error(res, error.message || "Failed to get investment profile");
  }
}

/**
 * PATCH /api/v1/profile/investment-profile
 * Update investment profile (partial: investor_types, thesis_summary, diligence_*, investment_size_*, equity_range_*).
 */
export async function updateInvestmentProfile(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return ApiResponse.error(res, "Unauthorized", 401);
    const body = req.body || {};
    const data: {
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
      geo_preferences?: Array<{
        country_id: number;
        state_id?: number | null;
      }>;
      committee_members?: Array<{
        name: string;
        role?: string | null;
        role_description?: string | null;
        photo?: string | null;
        email?: string | null;
        hide_email?: boolean;
      }>;
    } = {};
    if (body.investorTypes !== undefined) data.investor_types = Array.isArray(body.investorTypes) ? body.investorTypes : null;
    if (body.thesisSummary !== undefined) data.thesis_summary = body.thesisSummary ?? null;
    if (body.diligenceProcess !== undefined) data.diligence_process = body.diligenceProcess ?? null;
    if (body.diligenceDocument !== undefined) data.diligence_document = body.diligenceDocument ?? null;
    if (body.investmentSizeMin !== undefined) data.investment_size_min = body.investmentSizeMin ?? null;
    if (body.investmentSizeMax !== undefined) data.investment_size_max = body.investmentSizeMax ?? null;
    if (body.investmentSizeCurrency !== undefined) data.investment_size_currency = body.investmentSizeCurrency ?? null;
    if (body.equityRangeMin !== undefined) data.equity_range_min = body.equityRangeMin ?? null;
    if (body.equityRangeMax !== undefined) data.equity_range_max = body.equityRangeMax ?? null;
    if (body.preferredIndustries !== undefined) {
      const arr = Array.isArray(body.preferredIndustries) ? body.preferredIndustries : [];
      data.preferred_industries = arr.map((item: any) => ({
        industry_id: Number(item.industryId ?? item.industry_id),
        sub_industry_id: item.subIndustryId != null ? Number(item.subIndustryId) : item.sub_industry_id != null ? Number(item.sub_industry_id) : null,
        specialisation: item.specialisation ?? null,
        investment_stage: item.investmentStage ?? item.investment_stage ?? null,
        investment_criteria: item.investmentCriteria ?? item.investment_criteria ?? null,
      })).filter((item: any) => !Number.isNaN(item.industry_id));
    }

    if (body.geoPreferences !== undefined) {
      const arr = Array.isArray(body.geoPreferences) ? body.geoPreferences : [];
      data.geo_preferences = arr.map((item: any) => ({
        country_id: Number(item.countryId ?? item.country_id),
        state_id: item.stateId != null ? Number(item.stateId) : item.state_id != null ? Number(item.state_id) : null,
      })).filter((item: any) => !Number.isNaN(item.country_id));
    }

    if (body.committeeMembers !== undefined) {
      const arr = Array.isArray(body.committeeMembers) ? body.committeeMembers : [];
      data.committee_members = arr.map((item: any) => ({
        name: item.name ?? '',
        role: item.role ?? null,
        role_description: item.roleDescription ?? item.role_description ?? null,
        photo: item.photo ?? null,
        email: item.email ?? null,
        hide_email: item.hideEmail ?? item.hide_email ?? false,
      })).filter((item: any) => item.name);
    }

    const result = await InvestmentProfileService.update(userId, data);
    if (result.success) return ApiResponse.success(res, result.data, result.message);
    return ApiResponse.error(res, result.message);
  } catch (error: any) {
    return ApiResponse.error(res, error.message || "Failed to update investment profile");
  }
}
