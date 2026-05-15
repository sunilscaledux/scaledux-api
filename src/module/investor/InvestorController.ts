import { Request, Response } from "express";
import { InvestorService } from "./InvestorService";
import { ApiResponse } from "@utils/ApiResponse";

export class InvestorController {

  static async browseInvestors(req: Request, res: Response) {
    const { search, investorTypes, industries, businessStages, sortBy, limit, cursor } = req.query;

    const result = await InvestorService.browseInvestors({
      search: search as string,
      investorTypes: investorTypes ? String(investorTypes).split(',').map(s => s.trim()).filter(Boolean) : undefined,
      industries: industries ? String(industries).split(',').map(s => s.trim()).filter(Boolean) : undefined,
      businessStages: businessStages ? String(businessStages).split(',').map(s => s.trim()).filter(Boolean) : undefined,
      sortBy: sortBy as any,
      limit: limit ? parseInt(String(limit)) : 16,
      cursor: cursor ? String(cursor) : undefined,
    });

    if (result.success) return ApiResponse.success(res, result.data, result.message);
    return ApiResponse.error(res, result.message);
  }

  static async browseStartups(req: Request, res: Response) {
    const { search, industry, sortBy, limit, cursor } = req.query;

    const result = await InvestorService.browseStartups({
      search: search as string,
      industry: industry as string,
      sortBy: sortBy as any,
      limit: limit ? parseInt(String(limit)) : 16,
      cursor: cursor ? String(cursor) : undefined,
    });

    if (result.success) return ApiResponse.success(res, result.data, result.message);
    return ApiResponse.error(res, result.message);
  }

  static async getPublicProfile(req: Request, res: Response) {
    const uniqueId = req.params.uniqueId as string;
    if (!uniqueId) return ApiResponse.error(res, "Unique ID is required", 400);

    const result = await InvestorService.getPublicProfile(uniqueId);
    if (result.success) return ApiResponse.success(res, result.data, result.message);
    return ApiResponse.error(res, result.message, 404);
  }
}
