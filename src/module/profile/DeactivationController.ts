import { Request, Response } from "express";
import { ApiResponse } from "@utils/ApiResponse";
import * as DeactivationService from "./DeactivationService";
import { prisma } from "@services/prismaService";

const clearAuthCookieOpts = { httpOnly: true, secure: true, sameSite: "none" as const, path: "/" };

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

    // Deactivation = logout: clear auth cookies and soft-delete current device
    res.clearCookie("auth_token", clearAuthCookieOpts);
    const refreshToken = req.cookies?.refresh_token;
    if (refreshToken) {
      res.clearCookie("refresh_token", clearAuthCookieOpts);
      await prisma.loginDevice.updateMany({
        where: { refresh_token: refreshToken },
        data: { deleted_at: new Date() },
      });
    }

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
