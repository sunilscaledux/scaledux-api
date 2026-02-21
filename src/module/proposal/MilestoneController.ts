import { Request, Response } from "express";
import { ApiResponse } from "@utils/ApiResponse";
import * as MilestoneService from "./MilestoneService";

function getStringParam(param: unknown): string {
  return typeof param === "string" ? param : "";
}

export async function addMilestoneDocument(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }
  const milestoneId = getStringParam(req.params.milestoneId);
  const { file_url } = req.body ?? {};
  if (!milestoneId) {
    return ApiResponse.error(res, "Milestone ID is required", 400);
  }
  const result = await MilestoneService.addMilestoneDocument(userId, milestoneId, file_url);
  if (result.success) {
    return ApiResponse.success(res, undefined, result.message);
  }
  const code = result.message?.includes("not found") ? 404 : result.message?.includes("Only the") ? 403 : 400;
  return ApiResponse.error(res, result.message, code);
}

export async function submitMilestone(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }
  const milestoneId = getStringParam(req.params.milestoneId);
  const { remark } = req.body ?? {};
  if (!milestoneId) {
    return ApiResponse.error(res, "Milestone ID is required", 400);
  }
  const result = await MilestoneService.submitMilestone(
    userId,
    milestoneId,
    typeof remark === "string" ? remark : undefined
  );
  if (result.success) {
    return ApiResponse.success(res, undefined, result.message);
  }
  const code = result.message?.includes("not found") ? 404 : result.message?.includes("Only the") ? 403 : 400;
  return ApiResponse.error(res, result.message, code);
}
