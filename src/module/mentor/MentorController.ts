import { Request, Response } from "express";
import { MentorService } from "./MentorService";
import { ApiResponse } from "@utils/ApiResponse";

export class MentorController {

  static async browseMentors(req: Request, res: Response) {
    const { search, categoryId, skills, sortBy, page, limit } = req.query;

    const result = await MentorService.browseMentors({
      search: search as string,
      categoryId: categoryId ? parseInt(String(categoryId)) : undefined,
      skills: skills ? String(skills).split(',').map(s => s.trim()).filter(Boolean) : undefined,
      sortBy: sortBy as any,
      page: page ? parseInt(String(page)) : 1,
      limit: limit ? parseInt(String(limit)) : 12,
    });

    if (result.success) return ApiResponse.success(res, result.data, result.message);
    return ApiResponse.error(res, result.message);
  }

  static async getFeaturedMentors(req: Request, res: Response) {
    const limit = req.query.limit ? parseInt(String(req.query.limit)) : 6;
    const result = await MentorService.getFeaturedMentors(limit);

    if (result.success) return ApiResponse.success(res, result.data, result.message);
    return ApiResponse.error(res, result.message);
  }

  static async toggleSaveMentor(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) return ApiResponse.error(res, "User not authenticated", 401);

    const { mentorUniqueId } = req.body;
    if (!mentorUniqueId) return ApiResponse.error(res, "Mentor ID is required", 400);

    const result = await MentorService.toggleSaveMentor(userId, mentorUniqueId);
    if (result.success) return ApiResponse.success(res, result.data, result.message);
    return ApiResponse.error(res, result.message, 400);
  }

  static async getSavedMentors(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) return ApiResponse.error(res, "User not authenticated", 401);

    const result = await MentorService.getSavedMentors(userId);
    if (result.success) return ApiResponse.success(res, result.data, result.message);
    return ApiResponse.error(res, result.message);
  }

  static async checkSaved(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) return ApiResponse.error(res, "User not authenticated", 401);

    const uniqueId = req.params.uniqueId;
    if (!uniqueId) return ApiResponse.error(res, "Mentor ID is required", 400);

    const result = await MentorService.checkSaved(userId, uniqueId);
    if (result.success) return ApiResponse.success(res, result.data, result.message);
    return ApiResponse.error(res, result.message);
  }
}
