import { Request, Response } from 'express';
import { MentorProfileService } from './MentorProfileService';
import { ApiResponse } from '@utils/ApiResponse';
import Joi from 'joi';

/**
 * MentorProfileController
 * Handles mentor-specific profile operations
 */
export class MentorProfileController {
  /**
   * Get mentor profile
   * GET /api/v1/profile/mentor/me
   */
  static async getMyProfile(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      const result = await MentorProfileService.getProfileByUserId(userId);

      if (result.success && result.data?.profile_type === 'mentor') {
        return ApiResponse.success(res, result.data, result.message);
      } else {
        return ApiResponse.error(res, 'Mentor profile not found', 404);
      }
    } catch (error: any) {
      return ApiResponse.error(res, error.message || 'Failed to fetch mentor profile');
    }
  }

  /**
   * Update mentor expertise
   * PATCH /api/v1/profile/mentor/expertise
   */
  static async updateExpertise(req: Request, res: Response) {
    try {
      const schema = Joi.object({
        expertise_areas: Joi.array().items(Joi.string()).optional(),
        mentoring_experience: Joi.number().integer().min(0).optional(),
        availability: Joi.string().optional(),
        session_rate: Joi.number().min(0).optional()
      });

      const { value, error } = schema.validate(req.body, { abortEarly: false });
      if (error) {
        return ApiResponse.joiValidationError(res, error);
      }

      const userId = req.user.id;
      const result = await MentorProfileService.updateMentorProfile(userId, value);

      if (result.success) {
        return ApiResponse.success(res, result.data, result.message);
      } else {
        return ApiResponse.error(res, result.message);
      }
    } catch (error: any) {
      return ApiResponse.error(res, error.message || 'Failed to update expertise');
    }
  }

  /**
   * Update session rate
   * PATCH /api/v1/profile/mentor/session-rate
   */
  static async updateSessionRate(req: Request, res: Response) {
    try {
      const schema = Joi.object({
        session_rate: Joi.number().min(0).required(),
        currency_id: Joi.number().integer().optional()
      });

      const { value, error } = schema.validate(req.body, { abortEarly: false });
      if (error) {
        return ApiResponse.joiValidationError(res, error);
      }

      const userId = req.user.id;
      const result = await MentorProfileService.updateMentorProfile(userId, value);

      if (result.success) {
        return ApiResponse.success(res, result.data, result.message);
      } else {
        return ApiResponse.error(res, result.message);
      }
    } catch (error: any) {
      return ApiResponse.error(res, error.message || 'Failed to update session rate');
    }
  }

  /**
   * Update availability
   * PATCH /api/v1/profile/mentor/availability
   */
  static async updateAvailability(req: Request, res: Response) {
    try {
      const { availability } = req.body;

      if (!availability || typeof availability !== 'string') {
        return ApiResponse.error(res, 'Availability must be a string', 400);
      }

      const userId = req.user.id;
      const result = await MentorProfileService.updateMentorProfile(userId, { availability });

      if (result.success) {
        return ApiResponse.success(res, result.data, result.message);
      } else {
        return ApiResponse.error(res, result.message);
      }
    } catch (error: any) {
      return ApiResponse.error(res, error.message || 'Failed to update availability');
    }
  }
}
