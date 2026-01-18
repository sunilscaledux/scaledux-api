import { Request, Response } from 'express';
import { FreelancerProfileService } from './FreelancerProfileService';
import { ApiResponse } from '@utils/ApiResponse';
import { prisma } from '@services/prismaService';
import { getFileUrl } from '@utils/General';


export class UnifiedProfileController {
 
  static async getMyProfile(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      const profileType = (req.query.profile_type as string) || 'freelancer';
      
      // Validate profile type
      const validProfileTypes = ['freelancer', 'founder', 'mentor', 'investor'];
      if (!validProfileTypes.includes(profileType)) {
        return ApiResponse.error(res, 'Invalid profile type', 400);
      }
      
      // Get profile for the specified type
      const result = await FreelancerProfileService.getProfileByUserId(userId, profileType);

      if (result.success) {
        return ApiResponse.success(res, {
          ...result.data,
          availableProfileTypes: ['freelancer', 'founder'],
          activeProfileType: profileType
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
