import { Request, Response } from "express";
import { TaxInformationService } from "./TaxInformationService";
import { ApiResponse } from "@utils/ApiResponse";
import { saveTaxInformationSchema } from "./TaxInformationValidation";

export class TaxInformationController {

  static async saveTaxInformation(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) {
      return ApiResponse.error(res, "User not authenticated", 401);
    }

    const { error, value } = saveTaxInformationSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return ApiResponse.error(res, error.details.map(detail => detail.message).join(', '), 400);
    }

    try {
      const result = await TaxInformationService.saveTaxInformation(userId.toString(), value);
      if (!result.success) {
        return ApiResponse.error(res, result.message || "Failed to save tax information", 400);
      }
      return ApiResponse.success(res, result.data, result.message);
    } catch (err: any) {
      return ApiResponse.error(res, err.message || "Failed to save tax information", 400);
    }
  }

  static async getTaxInformation(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) {
      return ApiResponse.error(res, "User not authenticated", 401);
    }

    const result = await TaxInformationService.getTaxInformation(userId.toString());
    return ApiResponse.success(res, result.data);
  }
}
