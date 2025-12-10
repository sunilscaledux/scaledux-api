import { Request, Response } from "express";
import { CreateUserExpertiseInput, UpdateUserExpertiseInput } from "./ExpertiseType";
import { ExpertiseService } from "./ExpertiseService";
import { createUserExpertiseSchema, updateUserExpertiseSchema } from "./ExpertiseValidation";
import { ApiResponse } from "@utils/ApiResponse";

export async function createUserExpertise(req: Request, res: Response) {
  const rawBody = req.body || {};

  const { value, error } = createUserExpertiseSchema.validate(rawBody, {
    abortEarly: false,
  });
  if (error) {
    return ApiResponse.joiValidationError(res, error);
  }

  const userId = req.user.id;
  const result = await ExpertiseService.createUserExpertise(userId, value);

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message);
  } else {
    const statusCode = result.message.includes("Invalid") ? 400 : 500;
    return ApiResponse.error(res, result.message, statusCode);
  }
}

export async function getUserExpertises(req: Request, res: Response) {
  const userId = req.user.id;
  const result = await ExpertiseService.getUserExpertises(userId);

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message);
  } else {
    return ApiResponse.error(res, result.message);
  }
}

export async function updateUserExpertise(req: Request, res: Response) {
  const rawBody = req.body || {};
  const userId = req.user.id;
  const expertiseId = parseInt(req.params.id);

  // Add ID to validation data
  const validationData = { ...rawBody, id: expertiseId };

  const { value, error } = updateUserExpertiseSchema.validate(validationData, {
    abortEarly: false,
  });
  if (error) {
    return ApiResponse.joiValidationError(res, error);
  }

  const result = await ExpertiseService.updateUserExpertise(userId, expertiseId, value);

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message);
  } else {
    let statusCode = 500;
    if (result.message === "User expertise not found") statusCode = 404;
    else if (result.message.includes("Invalid")) statusCode = 400;
    return ApiResponse.error(res, result.message, statusCode);
  }
}

export async function deleteUserExpertise(req: Request, res: Response) {
  const userId = req.user.id;
  const expertiseId = parseInt(req.params.id);

  if (!expertiseId) {
    return ApiResponse.error(res, "User expertise ID is required", 400);
  }

  const result = await ExpertiseService.deleteUserExpertise(userId, expertiseId);

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message);
  } else {
    const statusCode = result.message === "User expertise not found" ? 404 : 500;
    return ApiResponse.error(res, result.message, statusCode);
  }
}

