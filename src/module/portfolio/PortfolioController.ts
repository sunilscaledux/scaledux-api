import { Request, Response } from 'express'
import { PortfolioService } from './PortfolioService'
import { ApiResponse } from '@utils/ApiResponse'
import { getRelativePath, getFileUrl, extractRelativePath } from '@utils/General'
import { 
  createPortfolioSchema, 
  updatePortfolioSchema, 
  createDraftPortfolioSchema, 
  updateDraftPortfolioSchema 
} from './PortfolioValidation'
import { CreatePortfolioInput, UpdatePortfolioInput } from './PortfolioType'
import fs from 'fs'
import path from 'path'

/**
 * Get all portfolios for the authenticated user
 */
export async function getUserPortfolios(req: Request, res: Response) {
  const userId = req.user?.id;
  const { status } = req.query; // 'DRAFT' or 'PUBLISHED'

  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }

  const result = await PortfolioService.getUserPortfolios(userId, status as string);

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message);
  } else {
    return ApiResponse.error(res, result.message);
  }
}

/**
 * Get portfolio by unique ID
 */
export async function getPortfolioById(req: Request, res: Response) {
  const userId = req.user?.id;
  const { id } = req.params; // This is unique_id

  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }

  if (!id) {
    return ApiResponse.error(res, "Portfolio ID is required", 400);
  }

  const result = await PortfolioService.getPortfolioById(userId, id);

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message);
  } else {
    const statusCode = result.message === "Portfolio not found" ? 404 : 500;
    return ApiResponse.error(res, result.message, statusCode);
  }
}

/**
 * Create new portfolio
 */
export async function createPortfolio(req: Request, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }

  // Validate request body
  const { value, error } = createPortfolioSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error) {
    return ApiResponse.joiValidationError(res, error);
  }

  const result = await PortfolioService.createPortfolio(userId, value);

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message, 201);
  } else {
    return ApiResponse.error(res, result.message);
  }
}

/**
 * Update portfolio
 */
export async function updatePortfolio(req: Request, res: Response) {
  const userId = req.user?.id;
  const { id } = req.params; // This is unique_id

  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }

  if (!id) {
    return ApiResponse.error(res, "Portfolio ID is required", 400);
  }

  // Validate request body
  const { value, error } = updatePortfolioSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error) {
    return ApiResponse.joiValidationError(res, error);
  }

  const result = await PortfolioService.updatePortfolio(userId, id, value);

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message);
  } else {
    const statusCode = result.message === "Portfolio not found" ? 404 : 500;
    return ApiResponse.error(res, result.message, statusCode);
  }
}

/**
 * Delete portfolio (soft delete)
 */
export async function deletePortfolio(req: Request, res: Response) {
  const userId = req.user?.id;
  const { id } = req.params; // This is unique_id

  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }

  if (!id) {
    return ApiResponse.error(res, "Portfolio ID is required", 400);
  }

  const result = await PortfolioService.deletePortfolio(userId, id);

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message);
  } else {
    const statusCode = result.message === "Portfolio not found" ? 404 : 500;
    return ApiResponse.error(res, result.message, statusCode);
  }
}

/**
 * Upload portfolio media (images, videos, documents)
 */
export async function uploadPortfolioMedia(req: Request, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }

  if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
    return ApiResponse.error(res, "No files uploaded", 400);
  }

  const result = await PortfolioService.uploadMedia(userId, req.files);

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message);
  } else {
    return ApiResponse.error(res, result.message);
  }
}

/**
 * Upload portfolio thumbnail
 */
export async function uploadPortfolioThumbnail(req: Request, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }

  if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
    return ApiResponse.error(res, "No files uploaded", 400);
  }

  const result = await PortfolioService.uploadThumbnail(userId, req.files);

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message);
  } else {
    return ApiResponse.error(res, result.message);
  }
}

/**
 * Delete portfolio file
 */
export async function deletePortfolioFile(req: Request, res: Response) {
  const userId = req.user?.id;
  const { filePath } = req.body;

  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }

  if (!filePath) {
    return ApiResponse.error(res, "File path is required", 400);
  }

  const result = await PortfolioService.deletePortfolioFile(userId, filePath);

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message);
  } else {
    return ApiResponse.error(res, result.message);
  }
}

/**
 * Duplicate portfolio
 */
export async function duplicatePortfolio(req: Request, res: Response) {
  const userId = req.user?.id;
  const { id } = req.params; // This is unique_id

  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }

  if (!id) {
    return ApiResponse.error(res, "Portfolio ID is required", 400);
  }

  const result = await PortfolioService.duplicatePortfolio(userId, id);

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message, 201);
  } else {
    const statusCode = result.message === "Portfolio not found" ? 404 : 500;
    return ApiResponse.error(res, result.message, statusCode);
  }
}
