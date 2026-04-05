import { Request, Response } from "express";
import { ReportService } from "./ReportService";
import { ApiResponse } from "@utils/ApiResponse";

export async function createReport(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }

  const { reportedUserUniqueId, reason, description } = req.body;

  if (!reportedUserUniqueId || !reason) {
    return ApiResponse.error(res, "Reported user and reason are required", 400);
  }

  const result = await ReportService.createReport(userId, reportedUserUniqueId, reason, description);

  if (result.success) {
    return ApiResponse.success(res, null, result.message);
  }
  return ApiResponse.error(res, result.message, 400);
}

export async function checkReport(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }

  const uniqueId = req.params.uniqueId;
  if (!uniqueId) {
    return ApiResponse.error(res, "User ID is required", 400);
  }

  const result = await ReportService.checkReport(userId, uniqueId);
  return ApiResponse.success(res, result.data);
}
