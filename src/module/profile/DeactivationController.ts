import { Request, Response } from "express";
import { ApiResponse } from "@utils/ApiResponse";
import * as DeactivationService from "./DeactivationService";
import { revokeAllDevices } from "@module/auth/AuthService";
import { emitSessionRevokedMany } from "@module/auth/authSocket";
import { baseCookieOptions } from "@utils/jwtUtils";

export async function confirmDeactivate(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return ApiResponse.unauthorized(res, "Authentication required");
    const { password } = req.body || {};
    if (!password || typeof password !== "string") {
      return ApiResponse.error(res, "Password is required", 400);
    }
    const result = await DeactivationService.confirmDeactivateWithPassword(userId, password);
    if (!result.success) return ApiResponse.error(res, result.message, 400);

    // Revoke all devices (same as logout-all); notify connected clients via existing socket
    const { deviceIds } = await revokeAllDevices(userId);
    if (deviceIds.length > 0) await emitSessionRevokedMany(userId, deviceIds);

    const clearAuthCookieOpts = baseCookieOptions(req);
    res.clearCookie("auth_token", clearAuthCookieOpts);
    res.clearCookie("refresh_token", clearAuthCookieOpts);

    return ApiResponse.success(res, result.data, result.message);
  } catch (e: any) {
    return ApiResponse.error(res, e?.message ?? "Failed to confirm deactivation");
  }
}

export async function scheduleDelete(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return ApiResponse.unauthorized(res, "Authentication required");
    const { password } = req.body || {};
    if (!password || typeof password !== "string") {
      return ApiResponse.error(res, "Password is required", 400);
    }
    const result = await DeactivationService.scheduleDeleteWithPassword(userId, password);
    if (result.success) return ApiResponse.success(res, result.data, result.message);
    return ApiResponse.error(res, result.message, 400);
  } catch (e: any) {
    return ApiResponse.error(res, e?.message ?? "Failed to schedule account deletion");
  }
}

export async function getDeactivationStatus(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return ApiResponse.unauthorized(res, "Authentication required");
    const result = await DeactivationService.getDeactivationStatus(userId);
    if (result.success) return ApiResponse.success(res, result.data, result.message);
    return ApiResponse.error(res, result.message, 400);
  } catch (e: any) {
    return ApiResponse.error(res, e?.message ?? "Failed to get deactivation status");
  }
}

export async function cancelDeactivation(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return ApiResponse.unauthorized(res, "Authentication required");
    const result = await DeactivationService.cancelDeactivation(userId);
    if (result.success) return ApiResponse.success(res, null, result.message);
    return ApiResponse.error(res, result.message, 400);
  } catch (e: any) {
    return ApiResponse.error(res, e?.message ?? "Failed to cancel deactivation");
  }
}
