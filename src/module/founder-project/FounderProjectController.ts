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
  const { status, search, categoryId, sortBy, contractStatus, milestoneStatus, contractStartFrom, contractEndTo } = req.query;

  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }

  const result = await FounderProjectService.getUserProjects(
    userId, 
    status as string,
    search as string,
    categoryId ? parseInt(categoryId as string) : undefined,
    sortBy as 'newest' | 'oldest' | 'budget' | 'updated' | 'proposals' | 'invited',
    contractStatus ? (contractStatus as string).split(',') : undefined,
    milestoneStatus ? (milestoneStatus as string).split(',') : undefined,
    contractStartFrom as string,
    contractEndTo as string
  );

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message);
  }

  return ApiResponse.error(res, result.message);
}

/**
 * Browse published projects (for service providers)
 * Works with or without authentication
 */
export async function browseProjects(req: Request, res: Response) {
  const userId = req.user?.id || null;
  const { 
    search, 
    categoryIds, 
    skills, 
    budgetMin, 
    budgetMax, 
    experienceLevel, 
    sortBy, 
    page, 
    limit, 
    filter 
  } = req.query;

  const result = await FounderProjectService.browseProjects(userId, {
    search: search as string,
    categoryIds: categoryIds ? (categoryIds as string).split(',').map(id => parseInt(id)) : undefined,
    skills: skills ? (skills as string).split(',') : undefined,
    budgetMin: budgetMin ? parseFloat(budgetMin as string) : undefined,
    budgetMax: budgetMax ? parseFloat(budgetMax as string) : undefined,
    experienceLevel: experienceLevel as string,
    sortBy: sortBy as 'newest' | 'oldest' | 'budget_high' | 'budget_low',
    page: page ? parseInt(page as string) : 1,
    limit: limit ? parseInt(limit as string) : 20,
    filter: filter as 'all' | 'saved'
  });

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message);
  }

  return ApiResponse.error(res, result.message);
}

/**
 * Get project by unique ID
 * Works with or without authentication.
 * When forEdit=true in query, only the project owner may fetch (returns 403 otherwise).
 */
export async function getProjectById(req: Request, res: Response) {
  const userId = req.user?.id || null;
  const id = getStringParam(req.params.id);
  const forEdit = req.query.forEdit === 'true' || req.query.forEdit === '1';

  if (!id) {
    return ApiResponse.error(res, "Project ID is required", 400);
  }

  if (forEdit && !userId) {
    return ApiResponse.error(res, "Authentication required to edit this project", 401);
  }

  const result = await FounderProjectService.getProjectById(userId, id);

  if (result.success) {
    const data = result.data as { is_owner?: boolean };
    if (forEdit && data?.is_owner === false) {
      return ApiResponse.error(res, "You do not have permission to edit this project", 403);
    }
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

/**
 * Get matching service providers for a project
 */
export async function getMatchingServiceProviders(req: Request, res: Response) {
  const userId = req.user?.id;
  const projectId = getStringParam(req.params.id);
  const { page, limit, sortBy, filter } = req.query;

  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }

  if (!projectId) {
    return ApiResponse.error(res, "Project ID is required", 400);
  }

  const result = await FounderProjectService.getMatchingServiceProviders(
    userId,
    projectId,
    page ? parseInt(page as string) : 1,
    limit ? parseInt(limit as string) : 10,
    sortBy as 'relevance' | 'rating' | 'hourly_rate' | 'projects_completed',
    filter as 'all' | 'invited' | 'saved'
  );

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message);
  } else {
    let statusCode = 500;
    if (result.message === "Project not found") {
      statusCode = 404;
    } else if (result.message?.includes("permission")) {
      statusCode = 403;
    }
    return ApiResponse.error(res, result.message, statusCode);
  }
}

/**
 * Invite a service provider to a project
 */
export async function inviteProvider(req: Request, res: Response) {
  const userId = req.user?.id;
  const projectId = getStringParam(req.params.id);
  const { providerId, message } = req.body;

  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }

  if (!projectId) {
    return ApiResponse.error(res, "Project ID is required", 400);
  }

  if (!providerId) {
    return ApiResponse.error(res, "Provider ID is required", 400);
  }

  const result = await FounderProjectService.inviteProvider(
    userId,
    projectId,
    parseInt(providerId),
    message
  );

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message);
  } else {
    const statusCode = result.message === "Project not found" || result.message === "Provider match not found" ? 404 : 500;
    return ApiResponse.error(res, result.message, statusCode);
  }
}

/**
 * Reject an invitation (service provider rejects founder's invitation)
 */
export async function rejectInvitation(req: Request, res: Response) {
  const userId = req.user?.id;
  const projectId = getStringParam(req.params.id);

  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }

  if (!projectId) {
    return ApiResponse.error(res, "Project ID is required", 400);
  }

  const result = await FounderProjectService.rejectInvitation(userId, projectId);

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message);
  } else {
    let statusCode = 500;
    if (result.message === "Project not found") {
      statusCode = 404;
    } else if (result.message === "You were not invited to this project") {
      statusCode = 400;
    }
    return ApiResponse.error(res, result.message, statusCode);
  }
}

/**
 * Toggle save provider for later
 */
export async function toggleSaveProvider(req: Request, res: Response) {
  const userId = req.user?.id;
  const projectId = getStringParam(req.params.id);
  const { providerId } = req.body;

  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }

  if (!projectId) {
    return ApiResponse.error(res, "Project ID is required", 400);
  }

  if (!providerId) {
    return ApiResponse.error(res, "Provider ID is required", 400);
  }

  const result = await FounderProjectService.toggleSaveProvider(
    userId,
    projectId,
    parseInt(providerId)
  );

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message);
  } else {
    const statusCode = result.message === "Project not found" || result.message === "Provider match not found" ? 404 : 500;
    return ApiResponse.error(res, result.message, statusCode);
  }
}

/**
 * Toggle save project for service providers
 */
export async function toggleSaveProject(req: Request, res: Response) {
  const userId = req.user?.id;
  const projectId = getStringParam(req.params.id);

  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }

  if (!projectId) {
    return ApiResponse.error(res, "Project ID is required", 400);
  }

  const result = await FounderProjectService.toggleSaveProject(userId, projectId);

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message);
  } else {
    let statusCode = 500;
    if (result.message === "Project not found") {
      statusCode = 404;
    } else if (result.message?.includes("cannot save your own")) {
      statusCode = 400;
    }
    return ApiResponse.error(res, result.message, statusCode);
  }
}