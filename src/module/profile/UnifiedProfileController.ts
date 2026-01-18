import { Request, Response } from 'express';
import { FreelancerProfileService } from './FreelancerProfileService';
import { FounderProfileService } from './FounderProfileService';
import { MentorProfileService } from './MentorProfileService';
import { InvestorProfileService } from './InvestorProfileService';
import { ApiResponse } from '@utils/ApiResponse';
import { prisma } from '@services/prismaService';
import { getFileUrl } from '@utils/General';


export class UnifiedProfileController {
 
  static async getMyProfile(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      
      // Get all user's profiles ordered by creation date
      const userProfiles = await prisma.userProfile.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'asc' },
        select: { profile_type: true, created_at: true }
      });

      if (!userProfiles || userProfiles.length === 0) {
        return ApiResponse.error(res, 'No profile found. Please create a profile first.', 404);
      }

      const requestedProfileType = req.query.profile_type as string;
      const profileType = requestedProfileType || userProfiles[0].profile_type;

      let result;
      switch (profileType) {
        case 'freelancer':
          result = await FreelancerProfileService.getProfileByUserId(userId);
          break;
        
        case 'founder':
          result = await FounderProfileService.getProfileByUserId(userId);
          break;
        
        case 'mentor':
          result = await MentorProfileService.getProfileByUserId(userId);
          break;
        
        case 'investor':
          result = await InvestorProfileService.getProfileByUserId(userId);
          break;
        
        default:
          result = await FreelancerProfileService.getProfileByUserId(userId);
      }

      if (result.success) {
        return ApiResponse.success(res, result.data, result.message);
      } else {
        return ApiResponse.error(res, result.message, 404);
      }
    } catch (error: any) {
      console.error('Get My Profile Error:', error);
      return ApiResponse.error(res, error.message || 'Failed to fetch profile');
    }
  }

 
  static async getAllMyProfiles(req: Request, res: Response) {
    try {
      const userId = req.user.id;

      const profiles = await prisma.userProfile.findMany({
        where: { user_id: userId },
        include: {
          country: true,
          state: true,
          currency: true
        },
        orderBy: { created_at: 'asc' }
      });

      // Map image URLs to full URLs
      const profilesWithUrls = profiles.map(profile => ({
        ...profile,
        profileImage: profile.profileImage ? getFileUrl(profile.profileImage) : null,
        coverImage: profile.coverImage ? getFileUrl(profile.coverImage) : null
      }));

      return ApiResponse.success(res, profilesWithUrls, 'All profiles retrieved successfully');
    } catch (error: any) {
      console.error('Get All Profiles Error:', error);
      return ApiResponse.error(res, error.message || 'Failed to fetch profiles');
    }
  }


  static async getMyFullProfile(req: Request, res: Response) {
    try {
      const userId = req.user.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          userProfiles: {
            include: {
              country: true,
              state: true,
              currency: true
            },
            orderBy: { created_at: 'asc' }
          }
        }
      });

      if (!user) {
        return ApiResponse.error(res, 'User not found', 404);
      }

      return ApiResponse.success(res, user, 'User profile retrieved successfully');
    } catch (error: any) {
      console.error('Get Full Profile Error:', error);
      return ApiResponse.error(res, error.message || 'Failed to fetch full profile');
    }
  }
}
