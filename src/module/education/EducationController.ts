import { Request, Response } from "express";
import { CreateEducationInput, UpdateEducationInput } from "./EducationType";
import { EducationService } from "./EducationService";
import { createEducationSchema, updateEducationSchema } from "./EducationValidation";
import { ApiResponse } from "@utils/ApiResponse";

export async function createEducation(req: Request, res: Response) {
  const rawBody = req.body || {};

  const { value, error } = createEducationSchema.validate(rawBody, {
    abortEarly: false,
  });
  if (error) {
    return ApiResponse.joiValidationError(res, error);
  }

  const userId = req.user.id;
  const result = await EducationService.createEducation(userId, value);

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message);
  } else {
    return ApiResponse.error(res, result.message);
  }
}

export async function getEducations(req: Request, res: Response) {
  const userId = req.user.id;
  const result = await EducationService.getEducations(userId);

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message);
  } else {
    return ApiResponse.error(res, result.message);
  }
}

export async function updateEducation(req: Request, res: Response) {
  const rawBody = req.body || {};
  const userId = req.user.id;
  const educationId = parseInt(req.params.id);

  // Add ID to validation data
  const validationData = { ...rawBody, id: educationId };

  const { value, error } = updateEducationSchema.validate(validationData, {
    abortEarly: false,
  });
  if (error) {
    return ApiResponse.joiValidationError(res, error);
  }

  const result = await EducationService.updateEducation(userId, educationId, value);

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message);
  } else {
    const statusCode = result.message === "Education not found" ? 404 : 500;
    return ApiResponse.error(res, result.message, statusCode);
  }
}

export async function deleteEducation(req: Request, res: Response) {
  const userId = req.user.id;
  const educationId = parseInt(req.params.id);

  if (!educationId) {
    return ApiResponse.error(res, "Education ID is required", 400);
  }

  const result = await EducationService.deleteEducation(userId, educationId);

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message);
  } else {
    const statusCode = result.message === "Education not found" ? 404 : 500;
    return ApiResponse.error(res, result.message, statusCode);
  }
}
