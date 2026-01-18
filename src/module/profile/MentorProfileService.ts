import { prisma } from '@services/prismaService';
import { ServiceResponse } from '@utils/ApiResponse';
import { ulid } from 'ulid';
import { MentorProfileInput } from './ProfileType';

/**
 * MentorProfileService
 * Handles all mentor-specific profile operations
 */
export class MentorProfileService {
  /**
   * Get mentor profile by user ID
   */
  static async getProfileByUserId(userId: number): Promise<ServiceResponse> {
    try {
      const profile = await prisma.userProfile.findUnique({
        where: {
          user_id_profile_type: {
            user_id: userId,
            profile_type: 'mentor'
          }
        },
        include: {
          country: true,
          state: true,
          currency: true,
        },
      });

      if (!profile || profile.profile_type !== 'mentor') {
        return {
          success: false,
          message: 'Mentor profile not found',
        };
      }

      return {
        success: true,
        message: 'Mentor profile retrieved successfully',
        data: profile,
      };
    } catch (error: any) {
      console.error('Get Mentor Profile Error:', error);
      return {
        success: false,
        message: 'Failed to retrieve mentor profile',
      };
    }
  }

  /**
   * Update mentor profile
   */
  static async updateMentorProfile(userId: number, data: Partial<MentorProfileInput>): Promise<ServiceResponse> {
    try {
      const profile = await prisma.userProfile.upsert({
        where: {
          user_id_profile_type: {
            user_id: userId,
            profile_type: 'mentor'
          }
        },
        update: data,
        create: {
          user_id: userId,
          unique_id: ulid(),
          profile_type: 'mentor',
          ...data,
        },
        include: {
          country: true,
          state: true,
          currency: true,
        },
      });

      return {
        success: true,
        message: 'Mentor profile updated successfully',
        data: profile,
      };
    } catch (error: any) {
      console.error('Update Mentor Profile Error:', error);
      return {
        success: false,
        message: 'Failed to update mentor profile',
      };
    }
  }

  /**
   * Update expertise areas
   */
  static async updateExpertise(userId: number, data: Partial<MentorProfileInput>): Promise<ServiceResponse> {
    try {
      const profile = await prisma.userProfile.upsert({
        where: {
          user_id_profile_type: {
            user_id: userId,
            profile_type: 'mentor'
          }
        },
        update: {
          expertise_areas: data.expertise_areas,
          mentoring_experience: data.mentoring_experience,
        },
        create: {
          user_id: userId,
          unique_id: ulid(),
          profile_type: 'mentor',
          expertise_areas: data.expertise_areas,
          mentoring_experience: data.mentoring_experience,
        },
      });

      return {
        success: true,
        message: 'Expertise updated successfully',
        data: profile,
      };
    } catch (error: any) {
      console.error('Update Expertise Error:', error);
      return {
        success: false,
        message: 'Failed to update expertise',
      };
    }
  }

  /**
   * Update session rate
   */
  static async updateSessionRate(userId: number, sessionRate: number, currencyId?: number): Promise<ServiceResponse> {
    try {
      const updateData: any = { session_rate: sessionRate };
      if (currencyId) updateData.currency_id = currencyId;

      const profile = await prisma.userProfile.upsert({
        where: {
          user_id_profile_type: {
            user_id: userId,
            profile_type: 'mentor'
          }
        },
        update: updateData,
        create: {
          user_id: userId,
          unique_id: ulid(),
          profile_type: 'mentor',
          ...updateData,
        },
        include: {
          currency: true,
        },
      });

      return {
        success: true,
        message: 'Session rate updated successfully',
        data: profile,
      };
    } catch (error: any) {
      console.error('Update Session Rate Error:', error);
      return {
        success: false,
        message: 'Failed to update session rate',
      };
    }
  }

  /**
   * Update availability
   */
  static async updateAvailability(userId: number, availability: string): Promise<ServiceResponse> {
    try {
      const profile = await prisma.userProfile.upsert({
        where: {
          user_id_profile_type: {
            user_id: userId,
            profile_type: 'mentor'
          }
        },
        update: {
          availability: availability,
        },
        create: {
          user_id: userId,
          unique_id: ulid(),
          profile_type: 'mentor',
          availability: availability,
        },
      });

      return {
        success: true,
        message: 'Availability updated successfully',
        data: profile,
      };
    } catch (error: any) {
      console.error('Update Availability Error:', error);
      return {
        success: false,
        message: 'Failed to update availability',
      };
    }
  }
}
