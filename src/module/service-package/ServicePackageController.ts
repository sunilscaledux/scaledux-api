import { Request, Response } from 'express'
import { ServicePackageService } from './ServicePackageService'
import { ApiResponse } from '@utils/ApiResponse'

/**
 * Get all service packages for authenticated user
 */
export async function getUserServicePackages(req: Request, res: Response) {
  const userId = req.user?.id;
  const { status } = req.query; // 'DRAFT' or 'PUBLISHED'

  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }

  const result = await ServicePackageService.getUserServicePackages(userId, status as string);

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message);
  } else {
    return ApiResponse.error(res, result.message);
  }
}

/**
 * Get service package by ID
 */
export async function getServicePackageById(req: Request, res: Response) {
  const userId = req.user?.id;
  const { id } = req.params; // This is unique_id

  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }

  if (!id) {
    return ApiResponse.error(res, "Service package ID is required", 400);
  }

  const result = await ServicePackageService.getServicePackageById(userId, id);

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message);
  } else {
    const statusCode = result.message === "Service package not found" ? 404 : 500;
    return ApiResponse.error(res, result.message, statusCode);
  }
}

/**
 * Create new service package
 */
export async function createServicePackage(req: Request, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }

  const result = await ServicePackageService.createServicePackage(userId, req.body);

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message, 201);
  } else {
    return ApiResponse.error(res, result.message);
  }
}

/**
 * Update service package
 */
export async function updateServicePackage(req: Request, res: Response) {
  const userId = req.user?.id;
  const { id } = req.params; // This is unique_id

  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }

  if (!id) {
    return ApiResponse.error(res, "Service package ID is required", 400);
  }

  const result = await ServicePackageService.updateServicePackage(userId, id, req.body);

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message);
  } else {
    const statusCode = result.message === "Service package not found" ? 404 : 500;
    return ApiResponse.error(res, result.message, statusCode);
  }
}

/**
 * Delete service package
 */
export async function deleteServicePackage(req: Request, res: Response) {
  const userId = req.user?.id;
  const { id } = req.params; // This is unique_id

  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }

  if (!id) {
    return ApiResponse.error(res, "Service package ID is required", 400);
  }

  const result = await ServicePackageService.deleteServicePackage(userId, id);

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message);
  } else {
    const statusCode = result.message === "Service package not found" ? 404 : 500;
    return ApiResponse.error(res, result.message, statusCode);
  }
}

/**
 * Upload service package media
 */
export async function uploadServicePackageMedia(req: Request, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }

  if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
    return ApiResponse.error(res, "No files uploaded", 400);
  }

  const result = await ServicePackageService.uploadServicePackageMedia(userId, req.files);

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message);
  } else {
    return ApiResponse.error(res, result.message);
  }
}

/**
 * Upload service package thumbnail
 */
export async function uploadServicePackageThumbnail(req: Request, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }

  if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
    return ApiResponse.error(res, "No files uploaded", 400);
  }

  const result = await ServicePackageService.uploadServicePackageThumbnail(userId, req.files);

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message);
  } else {
    return ApiResponse.error(res, result.message);
  }
}

/**
 * Delete service package file
 */
export async function deleteServicePackageFile(req: Request, res: Response) {
  const userId = req.user?.id;
  const { filePath } = req.body;

  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }

  if (!filePath) {
    return ApiResponse.error(res, "File path is required", 400);
  }

  const result = await ServicePackageService.deleteServicePackageFile(userId, filePath);

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message);
  } else {
    return ApiResponse.error(res, result.message);
  }
}
