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

export async function getMyReports(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) return ApiResponse.error(res, "User not authenticated", 401);

  const result = await ReportService.getMyReports(userId);
  if (result.success) return ApiResponse.success(res, result.data, result.message);
  return ApiResponse.error(res, result.message);
}

export async function getAllReports(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) return ApiResponse.error(res, "User not authenticated", 401);

  const limit = parseInt(req.query.limit as string, 10) || 50;
  const offset = parseInt(req.query.offset as string, 10) || 0;
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;

  const result = await ReportService.getAllReports({ limit, offset, status });
  if (result.success) return ApiResponse.success(res, result.data, result.message);
  return ApiResponse.error(res, result.message);
}

export async function updateReportStatus(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) return ApiResponse.error(res, "User not authenticated", 401);

  const reportId = parseInt(req.params.id, 10);
  if (isNaN(reportId)) return ApiResponse.error(res, "Invalid report ID", 400);

  const { status } = req.body;
  if (!status) return ApiResponse.error(res, "Status is required", 400);

  const result = await ReportService.updateReportStatus(reportId, status);
  if (result.success) return ApiResponse.success(res, null, result.message);
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
