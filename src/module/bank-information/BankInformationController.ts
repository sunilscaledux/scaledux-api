import { Request, Response } from "express";
import { BankInformationService } from "./BankInformationService";
import { ApiResponse } from "@utils/ApiResponse";
import { getStringParam } from "@utils/requestHelpers";
import { Log } from "@services/loggerService";

export class BankInformationController {

  static async getBankInformation(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return ApiResponse.error(res, "User not authenticated", 401);
      const result = await BankInformationService.getBankInformation(userId.toString());
      return ApiResponse.success(res, result.data);
    } catch (error: any) {
      Log.error("Error fetching bank information", { error });
      return ApiResponse.error(res, error.message || "Failed to fetch bank information");
    }
  }

  static async createBankInformation(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return ApiResponse.error(res, "User not authenticated", 401);
      const result = await BankInformationService.createBankInformation(userId.toString(), req.body);
      if (!result.success) return ApiResponse.error(res, result.message, 400);
      return ApiResponse.success(res, result.data, result.message);
    } catch (error: any) {
      Log.error("Error creating bank information", { error });
      return ApiResponse.error(res, error.message || "Failed to create bank information");
    }
  }

  static async resubmitForVerification(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return ApiResponse.error(res, "User not authenticated", 401);
      const entityType = req.body?.entityType;
      const result = await BankInformationService.resubmitForVerification(userId.toString(), entityType);
      if (!result.success) return ApiResponse.error(res, result.message, 400);
      return ApiResponse.success(res, result.data, result.message);
    } catch (error: any) {
      Log.error("Error resubmitting for verification", { error });
      return ApiResponse.error(res, error.message || "Failed to resubmit for verification");
    }
  }

  static async updateBankInformation(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return ApiResponse.error(res, "User not authenticated", 401);
      const recordId = getStringParam(req.params.bankInformationId);
      if (!recordId) return ApiResponse.error(res, "Bank information ID is required", 400);
      const result = await BankInformationService.updateBankInformation(userId.toString(), recordId, req.body);
      if (!result.success) return ApiResponse.error(res, result.message, 400);
      return ApiResponse.success(res, result.data, result.message);
    } catch (error: any) {
      Log.error("Error updating bank information", { error });
      return ApiResponse.error(res, error.message || "Failed to update bank information");
    }
  }
}
