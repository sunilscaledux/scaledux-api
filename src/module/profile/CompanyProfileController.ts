import { Request, Response } from 'express';
import { CompanyProfileService } from './CompanyProfileService';
import { ApiResponse } from '@utils/ApiResponse';

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
   * Upload profile image
   * POST /api/v1/profile/company/profile-image
   */
  static async uploadProfileImage(req: Request, res: Response) {
    try {
      if (!req.file) {
        return ApiResponse.error(res, 'No file uploaded', 400);
      }

      const userId = req.user.id;
      const result = await CompanyProfileService.uploadProfileImage(userId, req.file);

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
      const result = await CompanyProfileService.uploadCoverImage(userId, req.file);

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
