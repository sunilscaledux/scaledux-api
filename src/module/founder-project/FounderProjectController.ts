import { Request, Response } from 'express'
import { FounderProjectService } from './FounderProjectService'
import { ApiResponse } from '@utils/ApiResponse'
import { getStringParam } from '@utils/requestHelpers'
import { createFounderProjectSchema, updateFounderProjectSchema, saveDraftProjectSchema } from './FounderProjectValidation'

/**
 * Get all projects for the authenticated user
 */
export async function getCompanyProjects(req: Request, res: Response) {
  const userId = req.user?.id;
  const { status } = req.query; // 'DRAFT' or 'PUBLISHED'

  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }

  const result = await FounderProjectService.getUserProjects(userId, status as string);

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message);
  } else {
    return ApiResponse.error(res, result.message);
  }
}

/**
 * Get project by unique ID
 */
export async function getProjectById(req: Request, res: Response) {
  const userId = req.user?.id;
  const id = getStringParam(req.params.id);

  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }

  if (!id) {
    return ApiResponse.error(res, "Project ID is required", 400);
  }

  const result = await FounderProjectService.getProjectById(userId, id);

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message);
  } else {
    const statusCode = result.message === "Project not found" ? 404 : 500;
    return ApiResponse.error(res, result.message, statusCode);
  }
}

/**
 * Create new project
 */
export async function createProject(req: Request, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }

  // Validate request body
  const { value, error } = createFounderProjectSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error) {
    return ApiResponse.joiValidationError(res, error);
  }

  const result = await FounderProjectService.createProject(userId, value);

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message, 201);
  } else {
    return ApiResponse.error(res, result.message);
  }
}

/**
 * Save project as draft with minimal validation
 */
export async function saveDraft(req: Request, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }

  // Validate request body with draft schema (minimal validation)
  const { value, error } = saveDraftProjectSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error) {
    return ApiResponse.joiValidationError(res, error);
  }

  // Set default values for missing fields
  const draftData = {
    ...value,
    scopeOfWork: value.scopeOfWork || '',
    skillsRequired: value.skillsRequired || [],
    experienceNeeded: value.experienceNeeded || '',
    budget: value.budget || { currency: '', amount: '' },
    isNdaRequired: value.isNdaRequired || 'no',
    screeningQuestions: value.screeningQuestions || [],
    advancedPreferences: value.advancedPreferences || {
      englishLevel: '',
      hireWithin: '',
      timeRequirement: '',
      earnedAmount: '',
      loccation: ''
    },
    status: 'DRAFT'
  };

  const result = await FounderProjectService.createProject(userId, draftData);

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message, 201);
  } else {
    return ApiResponse.error(res, result.message);
  }
}

/**
 * Update project
 */
export async function updateProject(req: Request, res: Response) {
  const userId = req.user?.id;
  const id = getStringParam(req.params.id);

  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }

  if (!id) {
    return ApiResponse.error(res, "Project ID is required", 400);
  }

  // Validate request body
  const { value, error } = updateFounderProjectSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error) {
    return ApiResponse.joiValidationError(res, error);
  }

  const result = await FounderProjectService.updateProject(userId, id, value);

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message);
  } else {
    const statusCode = result.message === "Project not found" ? 404 : 500;
    return ApiResponse.error(res, result.message, statusCode);
  }
}

/**
 * Delete project (soft delete)
 */
export async function deleteProject(req: Request, res: Response) {
  const userId = req.user?.id;
  const id = getStringParam(req.params.id);

  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }

  if (!id) {
    return ApiResponse.error(res, "Project ID is required", 400);
  }

  const result = await FounderProjectService.deleteProject(userId, id);

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message);
  } else {
    const statusCode = result.message === "Project not found" ? 404 : 500;
    return ApiResponse.error(res, result.message, statusCode);
  }
}

/**
 * Duplicate project
 */
export async function duplicateProject(req: Request, res: Response) {
  const userId = req.user?.id;
  const id = getStringParam(req.params.id);

  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }

  if (!id) {
    return ApiResponse.error(res, "Project ID is required", 400);
  }

  const result = await FounderProjectService.duplicateProject(userId, id);

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message, 201);
  } else {
    const statusCode = result.message === "Project not found" ? 404 : 500;
    return ApiResponse.error(res, result.message, statusCode);
  }
}
