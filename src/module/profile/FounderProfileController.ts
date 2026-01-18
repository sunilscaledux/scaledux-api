import { Request, Response } from 'express';
import { FounderProfileService } from './FounderProfileService';
import { ApiResponse } from '@utils/ApiResponse';
import { FounderProfileInput } from './ProfileType';
import Joi from 'joi';

/**
 * FounderProfileController
 * Handles founder/company-specific profile operations
 */
export class FounderProfileController {
  /**
   * Get founder profile
   * GET /api/v1/profile/founder/me
   */
  static async getMyProfile(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      const result = await FounderProfileService.getProfileByUserId(userId);

      if (result.success && result.data?.profile_type === 'founder') {
        return ApiResponse.success(res, result.data, result.message);
      } else {
        return ApiResponse.error(res, 'Founder profile not found', 404);
      }
    } catch (error: any) {
      return ApiResponse.error(res, error.message || 'Failed to fetch founder profile');
    }
  }

  /**
   * Update company details
   * PATCH /api/v1/profile/founder/company
   */
  static async updateCompanyDetails(req: Request, res: Response) {
    try {
      const schema = Joi.object({
        company_name: Joi.string().optional(),
        company_tagline: Joi.string().optional(),
        year_founded: Joi.number().integer().min(1800).max(new Date().getFullYear()).optional(),
        company_size: Joi.string().optional(),
        headquarters: Joi.string().optional(),
        company_location: Joi.string().optional(),
        company_website: Joi.string().uri().optional(),
        industry: Joi.string().optional(),
        company_type: Joi.string().optional(),
        description: Joi.string().optional(),
        problem_statement: Joi.string().optional(),
        solution: Joi.string().optional(),
        target_market: Joi.string().optional(),
        unique_value_prop: Joi.string().optional(),
        business_model: Joi.string().optional(),
        revenue_model: Joi.string().optional()
      });

      const { value, error } = schema.validate(req.body, { abortEarly: false });
      if (error) {
        return ApiResponse.joiValidationError(res, error);
      }

      const userId = req.user.id;
      const result = await FounderProfileService.updateFounderProfile(userId, value);

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
   * PATCH /api/v1/profile/founder/funding
   */
  static async updateFundingInfo(req: Request, res: Response) {
    try {
      const schema = Joi.object({
        funding_stage: Joi.string().optional(),
        total_funding: Joi.number().min(0).optional(),
        seeking_funding: Joi.boolean().optional(),
        funding_amount: Joi.number().min(0).optional()
      });

      const { value, error } = schema.validate(req.body, { abortEarly: false });
      if (error) {
        return ApiResponse.joiValidationError(res, error);
      }

      const userId = req.user.id;
      const result = await FounderProfileService.updateFounderProfile(userId, value);

      if (result.success) {
        return ApiResponse.success(res, result.data, result.message);
      } else {
        return ApiResponse.error(res, result.message);
      }
    } catch (error: any) {
      return ApiResponse.error(res, error.message || 'Failed to update funding info');
    }
  }

  /**
   * Upload company logo
   * POST /api/v1/profile/founder/logo
   */
  static async uploadCompanyLogo(req: Request, res: Response) {
    try {
      if (!req.file) {
        return ApiResponse.error(res, 'No file uploaded', 400);
      }

      const userId = req.user.id;
      const result = await FounderProfileService.uploadCompanyLogo(userId, req.file);

      if (result.success) {
        return ApiResponse.success(res, result.data, result.message);
      } else {
        return ApiResponse.error(res, result.message);
      }
    } catch (error: any) {
      return ApiResponse.error(res, error.message || 'Failed to upload company logo');
    }
  }

  /**
   * Upload company cover image
   * POST /api/v1/profile/founder/cover
   */
  static async uploadCompanyCover(req: Request, res: Response) {
    try {
      if (!req.file) {
        return ApiResponse.error(res, 'No file uploaded', 400);
      }

      const userId = req.user.id;
      const result = await FounderProfileService.uploadCompanyCover(userId, req.file);

      if (result.success) {
        return ApiResponse.success(res, result.data, result.message);
      } else {
        return ApiResponse.error(res, result.message);
      }
    } catch (error: any) {
      return ApiResponse.error(res, error.message || 'Failed to upload company cover');
    }
  }

  /**
   * Update social links
   * PATCH /api/v1/profile/founder/social-links
   */
  static async updateSocialLinks(req: Request, res: Response) {
    try {
      const { social_links } = req.body;

      if (!social_links || typeof social_links !== 'object') {
        return ApiResponse.error(res, 'social_links must be an object', 400);
      }

      const userId = req.user.id;
      const result = await FounderProfileService.updateFounderProfile(userId, { social_links });

      if (result.success) {
        return ApiResponse.success(res, result.data, result.message);
      } else {
        return ApiResponse.error(res, result.message);
      }
    } catch (error: any) {
      return ApiResponse.error(res, error.message || 'Failed to update social links');
    }
  }
}
