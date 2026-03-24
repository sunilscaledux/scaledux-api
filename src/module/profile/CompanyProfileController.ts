import { Request, Response } from 'express';
import { CompanyProfileService } from './CompanyProfileService';
import { ApiResponse } from '@utils/ApiResponse';
import * as CompanyProfileValidation from './CompanyProfileValidation';

/**
 * CompanyProfileController
 * Handles HTTP requests for company/founder profile operations
 */
export class CompanyProfileController {
  /**
   * Get my company profile
   * GET /api/v1/profile/company/me
   */
  static async getMyProfile(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      const result = await CompanyProfileService.getMyProfile(userId);

      if (result.success) {
        return ApiResponse.success(res, result.data, result.message);
      } else {
        return ApiResponse.error(res, result.message);
      }
    } catch (error: any) {
      return ApiResponse.error(res, error.message || 'Failed to retrieve company profile');
    }
  }

  /**
   * Get public company profile by founder unique_id (no auth)
   * GET /api/v1/profile/company/public/:uniqueId
   */
  static async getPublicProfile(req: Request, res: Response) {
    try {
      const rawId = req.params.uniqueId;
      const uniqueId = typeof rawId === 'string' ? rawId : rawId?.[0];
      if (!uniqueId) {
        return ApiResponse.error(res, 'Unique ID is required', 400);
      }
      const result = await CompanyProfileService.getPublicByUniqueId(uniqueId);
      if (result.success) {
        return ApiResponse.success(res, result.data, result.message);
      }
      return ApiResponse.error(res, result.message, 404);
    } catch (error: any) {
      return ApiResponse.error(res, error.message || 'Failed to retrieve company profile');
    }
  }

  /**
   * Upload profile image
   * POST /api/v1/profile/company/profile-image
   */
  static async uploadProfileImage(req: Request, res: Response) {
    try {
      if (!req.file) {
        return ApiResponse.error(res, 'No file uploaded', 400);
      }

      const userId = req.user.id;
      const attachmentMeta = (req as any).attachmentMeta?.[0];
      const result = await CompanyProfileService.uploadProfileImage(userId, req.file, attachmentMeta);

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
   * POST /api/v1/profile/company/cover-image
   */
  static async uploadCoverImage(req: Request, res: Response) {
    try {
      if (!req.file) {
        return ApiResponse.error(res, 'No file uploaded', 400);
      }

      const userId = req.user.id;
      const attachmentMeta = (req as any).attachmentMeta?.[0];
      const result = await CompanyProfileService.uploadCoverImage(userId, req.file, attachmentMeta);

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
   * Update company overview
   * PATCH /api/v1/profile/company/overview
   */
  static async updateOverview(req: Request, res: Response) {
    try {
      const { error, value } = CompanyProfileValidation.updateOverviewSchema.validate(req.body, { abortEarly: false });
      
      if (error) {
        return ApiResponse.joiValidationError(res, error);
      }

      const userId = req.user.id;
      const result = await CompanyProfileService.updateOverview(userId, value);

      if (result.success) {
        return ApiResponse.success(res, result.data, result.message);
      } else {
        return ApiResponse.error(res, result.message);
      }
    } catch (error: any) {
      return ApiResponse.error(res, error.message || 'Failed to update company overview');
    }
  }

  /**
   * Update company details
   * PATCH /api/v1/profile/company/details
   */
  static async updateDetails(req: Request, res: Response) {
    try {
      const { error, value } = CompanyProfileValidation.updateDetailsSchema.validate(req.body, { abortEarly: false });
      
      if (error) {
        return ApiResponse.joiValidationError(res, error);
      }

      const userId = req.user.id;
      const result = await CompanyProfileService.updateDetails(userId, value);

      if (result.success) {
        return ApiResponse.success(res, result.data, result.message);
      } else {
        return ApiResponse.error(res, result.message);
      }
    } catch (error: any) {
      return ApiResponse.error(res, error.message || 'Failed to update company details');
    }
  }

  /**
   * Update funding information
   * PATCH /api/v1/profile/company/funding
   */
  static async updateFunding(req: Request, res: Response) {
    try {
      const { error, value } = CompanyProfileValidation.updateFundingSchema.validate(req.body, { abortEarly: false });
      
      if (error) {
        return ApiResponse.joiValidationError(res, error);
      }

      const userId = req.user.id;
      const result = await CompanyProfileService.updateFunding(userId, value);

      if (result.success) {
        return ApiResponse.success(res, result.data, result.message);
      } else {
        return ApiResponse.error(res, result.message);
      }
    } catch (error: any) {
      return ApiResponse.error(res, error.message || 'Failed to update funding information');
    }
  }

  /**
   * Update problem and solution
   * PATCH /api/v1/profile/company/problem-solution
   */
  static async updateProblemSolution(req: Request, res: Response) {
    try {
      const { error, value } = CompanyProfileValidation.updateProblemSolutionSchema.validate(req.body, { abortEarly: false });
      
      if (error) {
        return ApiResponse.joiValidationError(res, error);
      }

      const userId = req.user.id;
      const result = await CompanyProfileService.updateProblemSolution(userId, value);

      if (result.success) {
        return ApiResponse.success(res, result.data, result.message);
      } else {
        return ApiResponse.error(res, result.message);
      }
    } catch (error: any) {
      return ApiResponse.error(res, error.message || 'Failed to update problem and solution');
    }
  }

  /**
   * Update target market
   * PATCH /api/v1/profile/company/target-market
   */
  static async updateTargetMarket(req: Request, res: Response) {
    try {
      const { error, value } = CompanyProfileValidation.updateTargetMarketSchema.validate(req.body, { abortEarly: false });
      
      if (error) {
        return ApiResponse.joiValidationError(res, error);
      }

      const userId = req.user.id;
      const result = await CompanyProfileService.updateTargetMarket(userId, value);

      if (result.success) {
        return ApiResponse.success(res, result.data, result.message);
      } else {
        return ApiResponse.error(res, result.message);
      }
    } catch (error: any) {
      return ApiResponse.error(res, error.message || 'Failed to update target market');
    }
  }

  /**
   * Update revenue model
   * PATCH /api/v1/profile/company/revenue-model
   */
  static async updateRevenueModel(req: Request, res: Response) {
    try {
      const { error, value } = CompanyProfileValidation.updateRevenueModelSchema.validate(req.body, { abortEarly: false });
      
      if (error) {
        return ApiResponse.joiValidationError(res, error);
      }

      const userId = req.user.id;
      const result = await CompanyProfileService.updateRevenueModel(userId, value);

      if (result.success) {
        return ApiResponse.success(res, result.data, result.message);
      } else {
        return ApiResponse.error(res, result.message);
      }
    } catch (error: any) {
      return ApiResponse.error(res, error.message || 'Failed to update revenue model');
    }
  }

  /**
   * Update traction
   */
  static async updateTraction(req: Request, res: Response) {
    try {
      const { error, value } = CompanyProfileValidation.updateTractionSchema.validate(req.body);
      if (error) {
        return ApiResponse.error(res, error.details[0].message);
      }

      const userId = req.user.id;
      const result = await CompanyProfileService.updateTraction(userId, value);

      if (result.success) {
        return ApiResponse.success(res, result.data, result.message);
      } else {
        return ApiResponse.error(res, result.message);
      }
    } catch (error: any) {
      return ApiResponse.error(res, error.message || 'Failed to update traction');
    }
  }

  /**
   * Get pitch deck
   */
  static async getPitchDeck(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      const result = await CompanyProfileService.getPitchDeck(userId);
      if (result.success) {
        return ApiResponse.success(res, result.data, result.message);
      } else {
        return ApiResponse.error(res, result.message);
      }
    } catch (error: any) {
      return ApiResponse.error(res, error.message || 'Failed to get pitch deck');
    }
  }

  /**
   * Update pitch deck
   */
  static async updatePitchDeck(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      const result = await CompanyProfileService.updatePitchDeck(userId, req.body);
      if (result.success) {
        return ApiResponse.success(res, result.data, result.message);
      } else {
        return ApiResponse.error(res, result.message);
      }
    } catch (error: any) {
      return ApiResponse.error(res, error.message || 'Failed to update pitch deck');
    }
  }

  /**
   * Upload traction document with title
   */
  static async uploadTractionDocument(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      const { traction_title, traction_document } = req.body;
      const file = req.file;

      // Validate that we have at least a file, document ID, or title
      if (!file && !traction_title && !traction_document) {
        return ApiResponse.error(res, 'Either file, document ID, or title is required', 400);
      }

      // If attachment ID is provided directly (from MediaUploadV2), update it directly
      if (traction_document && !file) {
        const result = await CompanyProfileService.updateTraction(userId, {
          traction_title: traction_title || undefined,
          traction_document: traction_document
        });
        if (result.success) {
          return ApiResponse.success(res, result.data, result.message);
        } else {
          return ApiResponse.error(res, result.message);
        }
      }

      const attachmentMeta = (req as any).attachmentMeta?.[0];
      const result = await CompanyProfileService.uploadTractionDocument(userId, file, traction_title, attachmentMeta);

      if (result.success) {
        return ApiResponse.success(res, result.data, result.message);
      } else {
        return ApiResponse.error(res, result.message);
      }
    } catch (error: any) {
      return ApiResponse.error(res, error.message || 'Failed to upload traction document');
    }
  }
}
