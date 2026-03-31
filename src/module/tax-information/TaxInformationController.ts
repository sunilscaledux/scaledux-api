import { Request, Response } from "express";
import { TaxInformationService } from "./TaxInformationService";
import { ApiResponse } from "@utils/ApiResponse";
import { Log } from "@services/loggerService";
import { saveTaxInformationSchema } from "./TaxInformationValidation";

export class TaxInformationController {

  static async saveTaxInformation(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return ApiResponse.error(res, "User not authenticated", 401);
      }

      const { error, value } = saveTaxInformationSchema.validate(req.body, { abortEarly: false });
      if (error) {
        return ApiResponse.error(res, error.details.map(detail => detail.message).join(', '), 400);
      }

      const result = await TaxInformationService.saveTaxInformation(userId.toString(), value);
      if (!result.success) {
        return ApiResponse.error(res, result.message || "Verification failed", 400);
      }
      return ApiResponse.success(res, result.data, result.message);
    } catch (error: any) {
      Log.error("Error saving tax information", { error });
      return ApiResponse.error(res, error.message || "Failed to save tax information");
    }
  }

  static async getTaxInformation(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return ApiResponse.error(res, "User not authenticated", 401);
      }

      const result = await TaxInformationService.getTaxInformation(userId.toString());
      return ApiResponse.success(res, result.data);
    } catch (error: any) {
      Log.error("Error fetching tax information", { error });
      return ApiResponse.error(res, error.message || "Failed to fetch tax information");
    }
  }
}
