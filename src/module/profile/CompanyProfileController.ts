import { Request, Response } from 'express';
import { CompanyProfileService } from './CompanyProfileService';
import { ApiResponse } from '@utils/ApiResponse';

/**
 * CompanyProfileController
 * Handles HTTP requests for company/founder profile operations
 */
export class CompanyProfileController {
  /**
   * Update company overview
   * PATCH /api/v1/profile/company/overview
   */
  static async updateOverview(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      const result = await CompanyProfileService.updateOverview(userId, req.body);

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
      const userId = req.user.id;
      const result = await CompanyProfileService.updateDetails(userId, req.body);

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
      const userId = req.user.id;
      const result = await CompanyProfileService.updateFunding(userId, req.body);

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
      const userId = req.user.id;
      const result = await CompanyProfileService.updateProblemSolution(userId, req.body);

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
      const userId = req.user.id;
      const result = await CompanyProfileService.updateTargetMarket(userId, req.body);

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
      const userId = req.user.id;
      const result = await CompanyProfileService.updateRevenueModel(userId, req.body);

      if (result.success) {
        return ApiResponse.success(res, result.data, result.message);
      } else {
        return ApiResponse.error(res, result.message);
      }
    } catch (error: any) {
      return ApiResponse.error(res, error.message || 'Failed to update revenue model');
    }
  }
}
