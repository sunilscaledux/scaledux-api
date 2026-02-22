import { Request, Response } from "express";
import { ApiResponse } from "@utils/ApiResponse";
import * as DeliverableService from "./DeliverableService";

function getStringParam(param: unknown): string {
  return typeof param === "string" ? param : "";
}

export async function submitDeliverable(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }
  const deliverableId = getStringParam(req.params.deliverableId);
  const { remark, submitted_file } = req.body ?? {};
  if (!deliverableId) {
    return ApiResponse.error(res, "Deliverable ID is required", 400);
  }
  const files = Array.isArray(submitted_file) ? submitted_file : [];
  const result = await DeliverableService.submitDeliverable(
    userId,
    deliverableId,
    typeof remark === "string" ? remark : undefined,
    files
  );
  if (result.success) {
    return ApiResponse.success(res, undefined, result.message);
  }
  const code = result.message?.includes("not found") ? 404 : result.message?.includes("Only the") ? 403 : 400;
  return ApiResponse.error(res, result.message, code);
}

export async function requestChangesDeliverable(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }
  const deliverableId = getStringParam(req.params.deliverableId);
  const { message } = req.body ?? {};
  if (!deliverableId) {
    return ApiResponse.error(res, "Deliverable ID is required", 400);
  }
  const result = await DeliverableService.requestChangesDeliverable(
    userId,
    deliverableId,
    typeof message === "string" ? message : undefined
  );
  if (result.success) {
    return ApiResponse.success(res, undefined, result.message);
  }
  const code = result.message?.includes("not found") ? 404 : result.message?.includes("Only the") ? 403 : 400;
  return ApiResponse.error(res, result.message, code);
}
