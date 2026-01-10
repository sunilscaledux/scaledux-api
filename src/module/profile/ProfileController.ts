import {Request,Response} from 'express'
import { ProfileSummaryInput, PersonalInfoInput, HourlyRateInput } from './ProfileType'
import { ProfileService } from './ProfileService'
import { updateSummarySchema, updatePersonalInfoSchema, updateHourlyRateSchema } from "./ProfileValidation";
import { ApiResponse } from "@utils/ApiResponse";
import { getStringParam } from '@utils/requestHelpers';

export async function updateProfileSummary(req: Request, res: Response) {
  const rawBody = req.body || {};

  const { value, error } = updateSummarySchema.validate(rawBody, {
    abortEarly: false,
  });
  if (error) {
    return ApiResponse.joiValidationError(res, error);
  }

  const userId = req.user.id;
  const result = await ProfileService.updateProfileSummary(userId, value);

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message);
  } else {
    return ApiResponse.error(res, result.message);
  }
}

export async function updatePersonalInfo(req: Request, res: Response) {
  const rawBody = req.body || {};

  const { value, error } = updatePersonalInfoSchema.validate(rawBody, {
    abortEarly: false,
  });
  if (error) {
    return ApiResponse.joiValidationError(res, error);
  }

  const userId = req.user.id;
  const result = await ProfileService.updatePersonalInfo(userId, value);

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message);
  } else {
    return ApiResponse.error(res, result.message);
  }
}

export async function updatePrivacySettings(req: Request, res: Response) {
  const rawBody = req.body || {};

  // Simple validation for privacy settings
  const { hideEmail, hidePhone } = rawBody;
  
  if (hideEmail !== undefined && typeof hideEmail !== 'boolean') {
    return ApiResponse.error(res, "hideEmail must be a boolean", 400);
  }
  
  if (hidePhone !== undefined && typeof hidePhone !== 'boolean') {
    return ApiResponse.error(res, "hidePhone must be a boolean", 400);
  }

  const userId = req.user.id;
  const result = await ProfileService.updatePrivacySettings(userId, hideEmail, hidePhone);

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message);
  } else {
    return ApiResponse.error(res, result.message);
  }
}

export async function uploadProfileImage(req: Request, res: Response) {
  if (!req.file) {
    return ApiResponse.error(res, "No file uploaded", 400);
  }

  const userId = req.user.id;
  const result = await ProfileService.uploadProfileImage(userId, req.file);

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message);
  } else {
    return ApiResponse.error(res, result.message);
  }
}

export async function uploadCoverImage(req: Request, res: Response) {
  if (!req.file) {
    return ApiResponse.error(res, "No file uploaded", 400);
  }

  const userId = req.user.id;
  const result = await ProfileService.uploadCoverImage(userId, req.file);

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message);
  } else {
    return ApiResponse.error(res, result.message);
  }
}

export async function updateHourlyRate(req: Request, res: Response) {
  const rawBody = req.body || {};

  const { value, error } = updateHourlyRateSchema.validate(rawBody, {
    abortEarly: false,
  });
  if (error) {
    return ApiResponse.joiValidationError(res, error);
  }

  const userId = req.user.id;
  const result = await ProfileService.updateHourlyRate(userId, value);

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message);
  } else {
    return ApiResponse.error(res, result.message);
  }
}

export async function updateLanguages(req: Request, res: Response) {
  const rawBody = req.body || {};

  // Simple validation for languages
  const { languages } = rawBody;
  
  if (!Array.isArray(languages)) {
    return ApiResponse.error(res, "Languages must be an array", 400);
  }

  const userId = req.user.id;
  const result = await ProfileService.updateLanguages(userId, languages);

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message);
  } else {
    return ApiResponse.error(res, result.message);
  }
}

export async function updateAgencySettings(req: Request, res: Response) {
  const rawBody = req.body || {};

  // Simple validation for agency settings
  const { showAsAgency } = rawBody;
  
  if (typeof showAsAgency !== 'boolean') {
    return ApiResponse.error(res, "showAsAgency must be a boolean", 400);
  }

  const userId = req.user.id;
  const result = await ProfileService.updateAgencySettings(userId, showAsAgency);

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message);
  } else {
    return ApiResponse.error(res, result.message);
  }
}

export async function getPublicProfile(req: Request, res: Response) {
  const uniqueId = getStringParam(req.params.uniqueId);

  if (!uniqueId) {
    return ApiResponse.error(res, "Unique ID is required", 400);
  }

  const result = await ProfileService.getPublicProfile(uniqueId);

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message);
  } else {
    const statusCode = result.message === "User not found" ? 404 : 500;
    return ApiResponse.error(res, result.message, statusCode);
  }
}
