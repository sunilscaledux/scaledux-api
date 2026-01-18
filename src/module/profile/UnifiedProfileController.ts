import { Request, Response } from 'express';
import { FreelancerProfileService } from './FreelancerProfileService';
import { ApiResponse } from '@utils/ApiResponse';
import { prisma } from '@services/prismaService';
import { getFileUrl } from '@utils/General';


export class UnifiedProfileController {
 
  static async getMyProfile(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      
      // Get freelancer profile (only profile type supported for now)
      const result = await FreelancerProfileService.getProfileByUserId(userId);

      if (result.success) {
        return ApiResponse.success(res, {
          ...result.data,
          availableProfileTypes: ['freelancer'],
          activeProfileType: 'freelancer'
        }, result.message);
      } else {
        return ApiResponse.error(res, result.message, 404);
      }
    } catch (error: any) {
      console.error('Get My Profile Error:', error);
      return ApiResponse.error(res, error.message || 'Failed to fetch profile');
    }
  }

}
