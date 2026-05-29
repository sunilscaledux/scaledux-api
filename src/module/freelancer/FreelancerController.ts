import { Request, Response } from "express";
import { FreelancerService } from "./FreelancerService";
import { ApiResponse } from "@utils/ApiResponse";

export class FreelancerController {

  static async browseFreelancers(req: Request, res: Response) {
    const { search, categoryId, skills, sortBy, limit, cursor, minExperience, maxExperience, minRating, minHourlyRate, maxHourlyRate } = req.query;

    const result = await FreelancerService.browseFreelancers({
      search: search as string,
      categoryIds: categoryId ? String(categoryId).split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n)) : undefined,
      skills: skills ? String(skills).split(',').map(s => s.trim()).filter(Boolean) : undefined,
      sortBy: sortBy as any,
      minExperience: minExperience ? parseInt(String(minExperience)) : undefined,
      maxExperience: maxExperience ? parseInt(String(maxExperience)) : undefined,
      minRating: minRating ? parseFloat(String(minRating)) : undefined,
      minHourlyRate: minHourlyRate ? parseFloat(String(minHourlyRate)) : undefined,
      maxHourlyRate: maxHourlyRate ? parseFloat(String(maxHourlyRate)) : undefined,
      limit: limit ? parseInt(String(limit)) : 16,
      cursor: cursor ? String(cursor) : undefined,
    });

    if (result.success) return ApiResponse.success(res, result.data, result.message);
    return ApiResponse.error(res, result.message);
  }
}
