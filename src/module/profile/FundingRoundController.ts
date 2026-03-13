import { Request, Response } from 'express';
import { ApiResponse } from "@utils/ApiResponse";
import { FundingRoundService } from "./FundingRoundService";
import * as CompanyProfileValidation from "./CompanyProfileValidation";
import { getIntParam } from "@utils/requestHelpers";
import { Log } from '@services/loggerService';

export class FundingRoundController {
  /**
   * Get all funding rounds
   * GET /api/v1/profile/company/funding-rounds
   */
  static async getFundingRounds(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      const result = await FundingRoundService.getFundingRounds(userId);

      if (result.success) {
        return ApiResponse.success(res, result.data, result.message);
      }
      return ApiResponse.error(res, result.message);
    } catch (error: any) {
      Log.error("Error", { error });
      return ApiResponse.error(res, 'Failed to retrieve funding rounds');
    }
  }

  /**
   * Create a new funding round
   * POST /api/v1/profile/company/funding-rounds
   */
  static async createFundingRound(req: Request, res: Response) {
    try {
      const { error, value } = CompanyProfileValidation.createFundingRoundSchema.validate(req.body, { abortEarly: false });
      
      if (error) {
        return ApiResponse.joiValidationError(res, error);
      }

      const userId = req.user.id;
      const result = await FundingRoundService.createFundingRound(userId, value);

      if (result.success) {
        return ApiResponse.success(res, result.data, result.message);
      }
      return ApiResponse.error(res, result.message);
    } catch (error: any) {
      Log.error("Error", { error });
      return ApiResponse.error(res, 'Failed to create funding round');
    }
  }

  /**
   * Update a funding round
   * PATCH /api/v1/profile/company/funding-rounds/:id
   */
  static async updateFundingRound(req: Request, res: Response) {
    try {
      const { error, value } = CompanyProfileValidation.updateFundingRoundSchema.validate(req.body, { abortEarly: false });
      
      if (error) {
        return ApiResponse.joiValidationError(res, error);
      }

      const userId = req.user.id;
      const fundingRoundId = getIntParam(req.params.id);

      if (!fundingRoundId) {
        return ApiResponse.error(res, 'Invalid funding round ID');
      }

      const result = await FundingRoundService.updateFundingRound(userId, fundingRoundId, value);

      if (result.success) {
        return ApiResponse.success(res, result.data, result.message);
      }
      return ApiResponse.error(res, result.message);
    } catch (error: any) {
      Log.error("Error", { error });
      return ApiResponse.error(res, 'Failed to update funding round');
    }
  }

  /**
   * Delete a funding round
   * DELETE /api/v1/profile/company/funding-rounds/:id
   */
  static async deleteFundingRound(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      const fundingRoundId = getIntParam(req.params.id);

      if (!fundingRoundId) {
        return ApiResponse.error(res, 'Invalid funding round ID');
      }

      const result = await FundingRoundService.deleteFundingRound(userId, fundingRoundId);

      if (result.success) {
        return ApiResponse.success(res, null, result.message);
      }
      return ApiResponse.error(res, result.message);
    } catch (error: any) {
      Log.error("Error", { error });
      return ApiResponse.error(res, 'Failed to delete funding round');
    }
  }
}
