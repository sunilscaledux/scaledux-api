import { Request, Response } from "express";
import { ApiResponse } from "@utils/ApiResponse";
import * as MilestoneService from "./MilestoneService";

export async function releaseMilestonePayment(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }
  const milestoneId = getStringParam(req.params.milestoneId);
  if (!milestoneId) {
    return ApiResponse.error(res, "Milestone ID is required", 400);
  }
  const result = await MilestoneService.releaseMilestonePayment(userId, milestoneId);
  if (result.success) {
    return ApiResponse.success(res, undefined, result.message);
  }
  const code = result.message?.includes("not found") ? 404 : result.message?.includes("Only the") ? 403 : 400;
  return ApiResponse.error(res, result.message, code);
}

export async function approveMilestone(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }
  const milestoneId = getStringParam(req.params.milestoneId);
  const { remark } = req.body ?? {};
  if (!milestoneId) {
    return ApiResponse.error(res, "Milestone ID is required", 400);
  }
  const result = await MilestoneService.approveMilestone(
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

function getStringParam(param: unknown): string {
  return typeof param === "string" ? param : "";
}

export async function requestChangesMilestone(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }
  const milestoneId = getStringParam(req.params.milestoneId);
  const { message } = req.body ?? {};
  if (!milestoneId) {
    return ApiResponse.error(res, "Milestone ID is required", 400);
  }
  const result = await MilestoneService.requestChangesMilestone(
    userId,
    milestoneId,
    typeof message === "string" ? message : undefined
  );
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
  const { remark, submitted_file } = req.body ?? {};
  if (!milestoneId) {
    return ApiResponse.error(res, "Milestone ID is required", 400);
  }
  const files = Array.isArray(submitted_file) ? submitted_file : [];
  const result = await MilestoneService.submitMilestone(
    userId,
    milestoneId,
    typeof remark === "string" ? remark : undefined,
    files
  );
  if (result.success) {
    return ApiResponse.success(res, undefined, result.message);
  }
  const code = result.message?.includes("not found") ? 404 : result.message?.includes("Only the") ? 403 : 400;
  return ApiResponse.error(res, result.message, code);
}
