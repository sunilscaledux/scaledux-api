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
}
