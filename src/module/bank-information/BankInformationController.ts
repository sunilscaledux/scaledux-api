import { Request, Response } from "express";
import { BankInformationService } from "./BankInformationService";
import { ApiResponse } from "@utils/ApiResponse";
import { getStringParam } from "@utils/requestHelpers";

export class BankInformationController {

  static async getBankInformation(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) return ApiResponse.error(res, "User not authenticated", 401);
    const result = await BankInformationService.getBankInformation(userId.toString());
    return ApiResponse.success(res, result.data);
  }

  static async createBankInformation(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) return ApiResponse.error(res, "User not authenticated", 401);
    const result = await BankInformationService.createBankInformation(userId.toString(), req.body);
    if (!result.success) return ApiResponse.error(res, result.message, 400);
    return ApiResponse.success(res, result.data, result.message);
  }

  static async resubmitForVerification(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) return ApiResponse.error(res, "User not authenticated", 401);
    const entityType = req.body?.entityType;
    const result = await BankInformationService.resubmitForVerification(userId.toString(), entityType);
    if (!result.success) return ApiResponse.error(res, result.message, 400);
    return ApiResponse.success(res, result.data, result.message);
  }

  static async updateBankInformation(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) return ApiResponse.error(res, "User not authenticated", 401);
    const recordId = getStringParam(req.params.bankInformationId);
    if (!recordId) return ApiResponse.error(res, "Bank information ID is required", 400);
    const result = await BankInformationService.updateBankInformation(userId.toString(), recordId, req.body);
    if (!result.success) return ApiResponse.error(res, result.message, 400);
    return ApiResponse.success(res, result.data, result.message);
  }
}
