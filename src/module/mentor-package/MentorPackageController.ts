import { Request, Response } from "express";
import { MentorPackageService } from "./MentorPackageService";
import { ApiResponse } from "@utils/ApiResponse";
import { getStringParam } from "@utils/requestHelpers";

export async function createMentorPackage(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) return ApiResponse.error(res, "User not authenticated", 401);

  const result = await MentorPackageService.createMentorPackage(userId, req.body);
  if (result.success) {
    return ApiResponse.success(res, result.data, result.message, 201);
  }
  return ApiResponse.error(res, result.message);
}

export async function getUserMentorPackages(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) return ApiResponse.error(res, "User not authenticated", 401);

  const { status } = req.query;
  const result = await MentorPackageService.getUserMentorPackages(userId, status as string);
  if (result.success) {
    return ApiResponse.success(res, result.data, result.message);
  }
  return ApiResponse.error(res, result.message);
}

export async function getMentorPackageById(req: Request, res: Response) {
  const userId = req.user?.id;
  const id = getStringParam(req.params.id);
  if (!userId) return ApiResponse.error(res, "User not authenticated", 401);
  if (!id) return ApiResponse.error(res, "Mentor package ID is required", 400);

  const result = await MentorPackageService.getMentorPackageById(userId, id);
  if (result.success) {
    return ApiResponse.success(res, result.data, result.message);
  }
  const statusCode = result.message === "Mentor package not found" ? 404 : 500;
  return ApiResponse.error(res, result.message, statusCode);
}

export async function updateMentorPackage(req: Request, res: Response) {
  const userId = req.user?.id;
  const id = getStringParam(req.params.id);
  if (!userId) return ApiResponse.error(res, "User not authenticated", 401);
  if (!id) return ApiResponse.error(res, "Mentor package ID is required", 400);

  const result = await MentorPackageService.updateMentorPackage(userId, id, req.body);
  if (result.success) {
    return ApiResponse.success(res, result.data, result.message);
  }
  const statusCode = result.message === "Mentor package not found" ? 404 : 500;
  return ApiResponse.error(res, result.message, statusCode);
}

export async function deleteMentorPackage(req: Request, res: Response) {
  const userId = req.user?.id;
  const id = getStringParam(req.params.id);
  if (!userId) return ApiResponse.error(res, "User not authenticated", 401);
  if (!id) return ApiResponse.error(res, "Mentor package ID is required", 400);

  const result = await MentorPackageService.deleteMentorPackage(userId, id);
  if (result.success) {
    return ApiResponse.success(res, result.data, result.message);
  }
  const statusCode = result.message === "Mentor package not found" ? 404 : 500;
  return ApiResponse.error(res, result.message, statusCode);
}

export async function duplicateMentorPackage(req: Request, res: Response) {
  const userId = req.user?.id;
  const id = getStringParam(req.params.id);
  if (!userId) return ApiResponse.error(res, "User not authenticated", 401);
  if (!id) return ApiResponse.error(res, "Mentor package ID is required", 400);

  const result = await MentorPackageService.duplicateMentorPackage(userId, id);
  if (result.success) {
    return ApiResponse.success(res, result.data, result.message, 201);
  }
  const statusCode = result.message === "Mentor package not found" ? 404 : 500;
  return ApiResponse.error(res, result.message, statusCode);
}

export async function getPublicUserMentorPackages(req: Request, res: Response) {
  const uniqueId = getStringParam(req.params.uniqueId);
  if (!uniqueId) return ApiResponse.error(res, "User ID is required", 400);

  const result = await MentorPackageService.getPublicUserMentorPackages(uniqueId);
  if (result.success) {
    return ApiResponse.success(res, result.data, result.message);
  }
  return ApiResponse.error(res, result.message);
}

export async function getPublicMentorPackage(req: Request, res: Response) {
  const id = getStringParam(req.params.id);
  if (!id) return ApiResponse.error(res, "Mentor package ID is required", 400);

  const result = await MentorPackageService.getPublicMentorPackage(id);
  if (result.success) {
    return ApiResponse.success(res, result.data, result.message);
  }
  const statusCode = result.message === "Mentor package not found" ? 404 : 500;
  return ApiResponse.error(res, result.message, statusCode);
}
