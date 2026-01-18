import { Request, Response } from 'express';
import { InvestorProfileService } from './InvestorProfileService';
import { ApiResponse } from '@utils/ApiResponse';
import Joi from 'joi';

/**
 * InvestorProfileController
 * Handles investor-specific profile operations
 */
export class InvestorProfileController {
  /**
   * Get investor profile
   * GET /api/v1/profile/investor/me
   */
  static async getMyProfile(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      const result = await InvestorProfileService.getProfileByUserId(userId);

      if (result.success && result.data?.profile_type === 'investor') {
        return ApiResponse.success(res, result.data, result.message);
      } else {
        return ApiResponse.error(res, 'Investor profile not found', 404);
      }
    } catch (error: any) {
      return ApiResponse.error(res, error.message || 'Failed to fetch investor profile');
    }
  }

  /**
   * Update investment preferences
   * PATCH /api/v1/profile/investor/preferences
   */
  static async updatePreferences(req: Request, res: Response) {
    try {
      const schema = Joi.object({
        investment_focus: Joi.array().items(Joi.string()).optional(),
        investment_stage: Joi.string().optional(),
        ticket_size_min: Joi.number().min(0).optional(),
        ticket_size_max: Joi.number().min(0).optional(),
        portfolio_companies: Joi.array().items(Joi.string()).optional()
      });

      const { value, error } = schema.validate(req.body, { abortEarly: false });
      if (error) {
        return ApiResponse.joiValidationError(res, error);
      }

      const userId = req.user.id;
      const result = await InvestorProfileService.updateInvestorProfile(userId, value);

      if (result.success) {
        return ApiResponse.success(res, result.data, result.message);
      } else {
        return ApiResponse.error(res, result.message);
      }
    } catch (error: any) {
      return ApiResponse.error(res, error.message || 'Failed to update preferences');
    }
  }

  /**
   * Update ticket size range
   * PATCH /api/v1/profile/investor/ticket-size
   */
  static async updateTicketSize(req: Request, res: Response) {
    try {
      const schema = Joi.object({
        ticket_size_min: Joi.number().min(0).required(),
        ticket_size_max: Joi.number().min(Joi.ref('ticket_size_min')).required()
      });

      const { value, error } = schema.validate(req.body, { abortEarly: false });
      if (error) {
        return ApiResponse.joiValidationError(res, error);
      }

      const userId = req.user.id;
      const result = await InvestorProfileService.updateInvestorProfile(userId, value);

      if (result.success) {
        return ApiResponse.success(res, result.data, result.message);
      } else {
        return ApiResponse.error(res, result.message);
      }
    } catch (error: any) {
      return ApiResponse.error(res, error.message || 'Failed to update ticket size');
    }
  }

  /**
   * Update portfolio companies
   * PATCH /api/v1/profile/investor/portfolio
   */
  static async updatePortfolio(req: Request, res: Response) {
    try {
      const { portfolio_companies } = req.body;

      if (!Array.isArray(portfolio_companies)) {
        return ApiResponse.error(res, 'portfolio_companies must be an array', 400);
      }

      const userId = req.user.id;
      const result = await InvestorProfileService.updateInvestorProfile(userId, { portfolio_companies });

      if (result.success) {
        return ApiResponse.success(res, result.data, result.message);
      } else {
        return ApiResponse.error(res, result.message);
      }
    } catch (error: any) {
      return ApiResponse.error(res, error.message || 'Failed to update portfolio');
    }
  }
}
