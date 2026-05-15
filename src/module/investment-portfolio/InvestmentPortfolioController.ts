import { Request, Response } from "express";
import { InvestmentPortfolioService } from "./InvestmentPortfolioService";
import { ApiResponse } from "@utils/ApiResponse";
import { getStringParam } from "@utils/requestHelpers";
import {
  createInvestmentPortfolioSchema,
  updateInvestmentPortfolioSchema,
  createDraftInvestmentPortfolioSchema,
  updateDraftInvestmentPortfolioSchema
} from "./InvestmentPortfolioValidation";

export async function getPublicPortfoliosByUser(req: Request, res: Response) {
  const userUniqueId = req.params.userUniqueId as string;
  if (!userUniqueId) return ApiResponse.error(res, "User ID is required", 400);
  const result = await InvestmentPortfolioService.getPublicPortfoliosByUserUniqueId(userUniqueId);
  if (result.success) return ApiResponse.success(res, result.data, result.message);
  return ApiResponse.error(res, result.message, 404);
}

export async function getUserInvestmentPortfolios(req: Request, res: Response) {
  const userId = req.user?.id;
  const { status } = req.query;

  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }

  const result = await InvestmentPortfolioService.getUserInvestmentPortfolios(
    userId,
    status as string
  );

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message);
  } else {
    return ApiResponse.error(res, result.message);
  }
}

export async function getInvestmentPortfolioById(req: Request, res: Response) {
  const userId = req.user?.id;
  const id = getStringParam(req.params.id);

  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }
  if (!id) {
    return ApiResponse.error(res, "Investment portfolio ID is required", 400);
  }

  const result = await InvestmentPortfolioService.getInvestmentPortfolioById(
    userId,
    id
  );

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message);
  } else {
    const statusCode = result.message === "Investment portfolio not found" ? 404 : 500;
    return ApiResponse.error(res, result.message, statusCode);
  }
}

/**
 * Get published investment portfolio by id (public, no auth required).
 * Only PUBLISHED portfolios are returned; drafts are not exposed.
 */
export async function getPublicInvestmentPortfolioById(req: Request, res: Response) {
  const id = getStringParam(req.params.id);

  if (!id) {
    return ApiResponse.error(res, "Investment portfolio ID is required", 400);
  }

  const result = await InvestmentPortfolioService.getPublicByUniqueId(id);

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message);
  } else {
    const statusCode = result.message === "Investment portfolio not found" ? 404 : 500;
    return ApiResponse.error(res, result.message, statusCode);
  }
}

export async function createInvestmentPortfolio(req: Request, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }

  const { value, error } = createInvestmentPortfolioSchema.validate(req.body, {
    abortEarly: false
  });

  if (error) {
    return ApiResponse.joiValidationError(res, error);
  }

  const result = await InvestmentPortfolioService.createInvestmentPortfolio(
    userId,
    value
  );

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message, 201);
  } else {
    return ApiResponse.error(res, result.message);
  }
}

export async function saveDraft(req: Request, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }

  const { value, error } = createDraftInvestmentPortfolioSchema.validate(
    req.body,
    { abortEarly: false }
  );

  if (error) {
    return ApiResponse.joiValidationError(res, error);
  }

  const draftData = { ...value, status: "DRAFT" };
  const result = await InvestmentPortfolioService.createInvestmentPortfolio(
    userId,
    draftData
  );

  if (result.success) {
    return ApiResponse.success(res, result.data, "Draft saved successfully", 201);
  } else {
    return ApiResponse.error(res, result.message);
  }
}

export async function updateDraft(req: Request, res: Response) {
  const userId = req.user?.id;
  const id = getStringParam(req.params.id);

  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }
  if (!id) {
    return ApiResponse.error(res, "Investment portfolio ID is required", 400);
  }

  const { value, error } = updateDraftInvestmentPortfolioSchema.validate(
    req.body,
    { abortEarly: false }
  );

  if (error) {
    return ApiResponse.joiValidationError(res, error);
  }

  const draftData = { ...value, status: "DRAFT" };
  const result = await InvestmentPortfolioService.updateInvestmentPortfolio(
    userId,
    id,
    draftData
  );

  if (result.success) {
    return ApiResponse.success(res, result.data, "Draft updated successfully");
  } else {
    const statusCode = result.message === "Investment portfolio not found" ? 404 : 500;
    return ApiResponse.error(res, result.message, statusCode);
  }
}

export async function updateInvestmentPortfolio(req: Request, res: Response) {
  const userId = req.user?.id;
  const id = getStringParam(req.params.id);

  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }
  if (!id) {
    return ApiResponse.error(res, "Investment portfolio ID is required", 400);
  }

  const { value, error } = updateInvestmentPortfolioSchema.validate(req.body, {
    abortEarly: false
  });

  if (error) {
    return ApiResponse.joiValidationError(res, error);
  }

  const result = await InvestmentPortfolioService.updateInvestmentPortfolio(
    userId,
    id,
    value
  );

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message);
  } else {
    const statusCode = result.message === "Investment portfolio not found" ? 404 : 500;
    return ApiResponse.error(res, result.message, statusCode);
  }
}

export async function deleteInvestmentPortfolio(req: Request, res: Response) {
  const userId = req.user?.id;
  const id = getStringParam(req.params.id);

  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }
  if (!id) {
    return ApiResponse.error(res, "Investment portfolio ID is required", 400);
  }

  const result = await InvestmentPortfolioService.deleteInvestmentPortfolio(
    userId,
    id
  );

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message);
  } else {
    const statusCode = result.message === "Investment portfolio not found" ? 404 : 500;
    return ApiResponse.error(res, result.message, statusCode);
  }
}

export async function duplicateInvestmentPortfolio(req: Request, res: Response) {
  const userId = req.user?.id;
  const id = getStringParam(req.params.id);

  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }
  if (!id) {
    return ApiResponse.error(res, "Investment portfolio ID is required", 400);
  }

  const result = await InvestmentPortfolioService.duplicateInvestmentPortfolio(
    userId,
    id
  );

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message, 201);
  } else {
    const statusCode = result.message === "Investment portfolio not found" ? 404 : 500;
    return ApiResponse.error(res, result.message, statusCode);
  }
}
