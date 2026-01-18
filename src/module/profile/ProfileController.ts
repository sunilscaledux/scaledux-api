import { Request, Response } from 'express'
import { ProfileService } from './ProfileService'
import { ApiResponse } from "@utils/ApiResponse";
import { getStringParam } from '@utils/requestHelpers';

/**
 * ProfileController - Legacy controller
 * For profile management, use FreelancerProfileController or CompanyProfileController
 * This file only contains getPublicProfile which is still used
 */

export async function getPublicProfile(req: Request, res: Response) {
  const uniqueId = getStringParam(req.params.uniqueId);

  if (!uniqueId) {
    return ApiResponse.error(res, "Unique ID is required", 400);
  }

  const result = await ProfileService.getPublicProfile(uniqueId);

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message);
  } else {
    const statusCode = result.message === "User not found" ? 404 : 500;
    return ApiResponse.error(res, result.message, statusCode);
  }
}
