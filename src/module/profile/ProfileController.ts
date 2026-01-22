import { Request, Response } from 'express';
import { PersonalInfoService } from './ProfileService';
import { ApiResponse } from '@utils/ApiResponse';
import { updateSummarySchema, updatePersonalInfoSchema, updateHourlyRateSchema } from './ProfileValidation';

export class ProfileController {
  
  static async getMyProfile(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      const result = await PersonalInfoService.getProfileByUserId(userId);

      if (result.success) {
        return ApiResponse.success(res, result.data, result.message);
      } else {
        return ApiResponse.error(res, result.message, 404);
      }
    } catch (error: any) {
      return ApiResponse.error(res, error.message || 'Failed to fetch freelancer profile');
    }
  }

  static async updateSummary(req: Request, res: Response) {
    try {
      const { value, error } = updateSummarySchema.validate(req.body, { abortEarly: false });
      if (error) {
        return ApiResponse.joiValidationError(res, error);
      }

      const userId = req.user.id;
      const result = await PersonalInfoService.updateProfileSummary(userId, value);

      if (result.success) {
        return ApiResponse.success(res, result.data, result.message);
      } else {
        return ApiResponse.error(res, result.message);
      }
    } catch (error: any) {
      return ApiResponse.error(res, error.message || 'Failed to update summary');
    }
  }

  /**
   * Update freelancer personal info
   * PATCH /api/v1/profile/freelancer/personal-info
   */
  static async updatePersonalInfo(req: Request, res: Response) {
    try {
      const { value, error } = updatePersonalInfoSchema.validate(req.body, { abortEarly: false });
      if (error) {
        return ApiResponse.joiValidationError(res, error);
      }

      const userId = req.user.id;
      const result = await PersonalInfoService.updatePersonalInfo(userId, value);

      if (result.success) {
        return ApiResponse.success(res, result.data, result.message);
      } else {
        return ApiResponse.error(res, result.message);
      }
    } catch (error: any) {
      return ApiResponse.error(res, error.message || 'Failed to update personal info');
    }
  }

  /**
   * Update hourly rate
   * PATCH /api/v1/profile/freelancer/hourly-rate
   */
  static async updateHourlyRate(req: Request, res: Response) {
    try {
      const { value, error } = updateHourlyRateSchema.validate(req.body, { abortEarly: false });
      if (error) {
        return ApiResponse.joiValidationError(res, error);
      }

      const userId = req.user.id;
      const result = await PersonalInfoService.updateHourlyRate(userId, value);

      if (result.success) {
        return ApiResponse.success(res, result.data, result.message);
      } else {
        return ApiResponse.error(res, result.message);
      }
    } catch (error: any) {
      return ApiResponse.error(res, error.message || 'Failed to update hourly rate');
    }
  }

  /**
   * Update languages
   * PATCH /api/v1/profile/freelancer/languages
   */
  static async updateLanguages(req: Request, res: Response) {
    try {
      const { languages } = req.body;

      if (!Array.isArray(languages)) {
        return ApiResponse.error(res, 'Languages must be an array', 400);
      }

      const userId = req.user.id;
      const result = await PersonalInfoService.updateLanguages(userId, languages);

      if (result.success) {
        return ApiResponse.success(res, result.data, result.message);
      } else {
        return ApiResponse.error(res, result.message);
      }
    } catch (error: any) {
      return ApiResponse.error(res, error.message || 'Failed to update languages');
    }
  }

  /**
   * Upload profile image
   * POST /api/v1/profile/freelancer/profile-image
   */
  static async uploadProfileImage(req: Request, res: Response) {
    try {
      if (!req.file) {
        return ApiResponse.error(res, 'No file uploaded', 400);
      }

      const userId = req.user.id;
      const profileType = req.body.profile_type || 'freelancer';
      const result = await PersonalInfoService.uploadProfileImage(userId, req.file, profileType);

      if (result.success) {
        return ApiResponse.success(res, result.data, result.message);
      } else {
        return ApiResponse.error(res, result.message);
      }
    } catch (error: any) {
      return ApiResponse.error(res, error.message || 'Failed to upload profile image');
    }
  }

  /**
   * Upload cover image
   * POST /api/v1/profile/freelancer/cover-image
   */
  static async uploadCoverImage(req: Request, res: Response) {
    try {
      if (!req.file) {
        return ApiResponse.error(res, 'No file uploaded', 400);
      }

      const userId = req.user.id;
      const profileType = req.body.profile_type || 'freelancer';
      const result = await PersonalInfoService.uploadCoverImage(userId, req.file, profileType);

      if (result.success) {
        return ApiResponse.success(res, result.data, result.message);
      } else {
        return ApiResponse.error(res, result.message);
      }
    } catch (error: any) {
      return ApiResponse.error(res, error.message || 'Failed to upload cover image');
    }
  }

  /**
   * Update privacy settings
   * PATCH /api/v1/profile/freelancer/privacy
   */
  static async updatePrivacySettings(req: Request, res: Response) {
    try {
      const { hideEmail, hidePhone } = req.body;

      if (hideEmail !== undefined && typeof hideEmail !== 'boolean') {
        return ApiResponse.error(res, 'hideEmail must be a boolean', 400);
      }

      if (hidePhone !== undefined && typeof hidePhone !== 'boolean') {
        return ApiResponse.error(res, 'hidePhone must be a boolean', 400);
      }

      const userId = req.user.id;
      const result = await PersonalInfoService.updatePrivacySettings(userId, hideEmail, hidePhone);

      if (result.success) {
        return ApiResponse.success(res, result.data, result.message);
      } else {
        return ApiResponse.error(res, result.message);
      }
    } catch (error: any) {
      return ApiResponse.error(res, error.message || 'Failed to update privacy settings');
    }
  }

  /**
   * Update agency settings
   * PATCH /api/v1/profile/freelancer/agency-settings
   */
  static async updateAgencySettings(req: Request, res: Response) {
    try {
      const { show_as_agency } = req.body;

      if (show_as_agency !== undefined && typeof show_as_agency !== 'boolean') {
        return ApiResponse.error(res, 'show_as_agency must be a boolean', 400);
      }

      const userId = req.user.id;
      const result = await PersonalInfoService.updateAgencySettings(userId, show_as_agency);

      if (result.success) {
        return ApiResponse.success(res, result.data, result.message);
      } else {
        return ApiResponse.error(res, result.message);
      }
    } catch (error: any) {
      return ApiResponse.error(res, error.message || 'Failed to update agency settings');
    }
  }

  /**
   * Get public profile by unique_id
   * GET /api/v1/profile/:uniqueId
   */
  static async getPublicProfile(req: Request, res: Response) {
    try {
      const { uniqueId } = req.params;

      if (!uniqueId) {
        return ApiResponse.error(res, 'Unique ID is required', 400);
      }

      const personalInfo = await PersonalInfoService.getProfileByUniqueId(uniqueId);
      
      if (personalInfo.success) {
        return ApiResponse.success(res, personalInfo.data, personalInfo.message);
      }
      return ApiResponse.error(res, 'Profile not found', 404);
    } catch (error: any) {
      return ApiResponse.error(res, error.message || 'Failed to fetch public profile');
    }
  }
}
