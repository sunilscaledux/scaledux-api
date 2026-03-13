import { Request, Response } from 'express';
import { ApiResponse } from "@utils/ApiResponse";
import { RaisingFundService } from "./RaisingFundService";
import * as CompanyProfileValidation from "./CompanyProfileValidation";
import { Log } from '@services/loggerService';

export class RaisingFundController {
  /**
   * Get raising fund status
   * GET /api/v1/profile/company/raising-fund
   */
  static async getRaisingFund(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      const result = await RaisingFundService.getRaisingFund(userId);

      if (result.success) {
        return ApiResponse.success(res, result.data, result.message);
      }
      return ApiResponse.error(res, result.message);
    } catch (error: any) {
      Log.error("Error", { error });
      return ApiResponse.error(res, 'Failed to retrieve raising fund status');
    }
  }

  /**
   * Update raising fund status
   * PATCH /api/v1/profile/company/raising-fund
   */
  static async updateRaisingFund(req: Request, res: Response) {
    try {
      const { error, value } = CompanyProfileValidation.raisingFundSchema.validate(req.body, { abortEarly: false });
      
      if (error) {
        return ApiResponse.joiValidationError(res, error);
      }

      const userId = req.user.id;
      const result = await RaisingFundService.updateRaisingFund(userId, value);

      if (result.success) {
        return ApiResponse.success(res, result.data, result.message);
      }
      return ApiResponse.error(res, result.message);
    } catch (error: any) {
      Log.error("Error", { error });
      return ApiResponse.error(res, 'Failed to update raising fund status');
    }
  }
}
