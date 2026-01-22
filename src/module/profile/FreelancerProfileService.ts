import { prisma } from '@services/prismaService';
import { ServiceResponse } from '@utils/ApiResponse';
import { getFileUrl, getRelativePath } from '@utils/General';
import { ProfileSummaryInput, PersonalInfoInput, HourlyRateInput } from './ProfileType';
import { ulid } from 'ulid';

/**
 * FreelancerProfileService
 * Handles all freelancer-specific profile operations
 */
export class FreelancerProfileService {
  /**
   * Get profile by user ID and profile type
   */
  static async getProfileByUserId(userId: number, profileType: string = 'freelancer'): Promise<ServiceResponse> {
    try {
      let profile = await prisma.personalInfo.findUnique({
        where: { user_id: userId },
        include: {
          user: {
            include: {
              currency: true,
            },
          },
          country: true,
          state: true,
        },
      });

      // Auto-create profile if it doesn't exist
      if (!profile) {
        profile = await prisma.personalInfo.create({
          data: {
            user_id: userId,
            unique_id: ulid(),
          },
          include: {
            user: {
              include: {
                currency: true,
              },
            },
            country: true,
            state: true,
          },
        });
      }

      // Combine user account data with profile data (UserDetail = UserProfile + User)
      const userDetail = {
        // Profile data (from FreelancerProfile table) - explicitly select fields
        id: profile.id,
        unique_id: profile.unique_id,
        profile_type: 'freelancer', // Hardcoded since this is FreelancerProfile
        profileImage: profile.profileImage ? getFileUrl(profile.profileImage) : null,
        coverImage: profile.coverImage ? getFileUrl(profile.coverImage) : null,
        hideEmail: profile.hideEmail,
        hidePhone: profile.hidePhone,
        title: profile.title,
        about: profile.about,
        address: profile.address,
        address_line_2: profile.address_line_2,
        city: profile.city,
        website: profile.website,
        zipCode: profile.zipCode,
        hourly_rate: profile.hourly_rate,
        links: profile.links,
        languages: profile.languages,
        // Relations
        country: profile.country,
        state: profile.state,
        currency: profile.user.currency,
        // User account data (from User table)
        firstName: profile.user.first_name,
        lastName: profile.user.last_name,
        email: profile.user.email,
        phone: profile.user.phone,
        emailVerified: !!profile.user.email_verified_at,
        phoneVerified: !!profile.user.phone_verified_at,
        status: profile.user.status?.toString(),
        identity_verification_status: profile.user.identity_verification_status,
        identity_verified_at: profile.user.identity_verified_at?.toISOString(),
        agency_verification_status: profile.user.agency_verification_status,
        agency_verified_at: profile.user.agency_verified_at?.toISOString(),
        show_as_agency: profile.user.show_as_agency,
        // Response metadata
        availableProfileTypes: ['freelancer'],
        activeProfileType: 'freelancer',
      };

      return {
        success: true,
        message: 'User profile retrieved successfully',
        data: userDetail,
      };
    } catch (error: any) {
      console.error('Get Freelancer Profile Error:', error);
      return {
        success: false,
        message: 'Failed to retrieve user profile',
      };
    }
  }

  /**
   * Update profile summary (title and about)
   */
  static async updateProfileSummary(userId: number, data: ProfileSummaryInput): Promise<ServiceResponse> {
    try {
      const profile = await prisma.personalInfo.upsert({
        where: { user_id: userId },
        update: {
          title: data.title,
          about: data.about,
        },
        create: {
          user_id: userId,
          unique_id: ulid(),
          title: data.title,
          about: data.about,
        },
        include: {
          country: true,
          state: true,
        },
      });

      return {
        success: true,
        message: 'Profile summary updated successfully',
        data: profile,
      };
    } catch (error: any) {
      console.error('Update Profile Summary Error:', error);
      return {
        success: false,
        message: 'Failed to update profile summary',
      };
    }
  }

  /**
   * Update personal information
   */
  static async updatePersonalInfo(userId: number, data: PersonalInfoInput): Promise<ServiceResponse> {
    try {
      const profile = await prisma.personalInfo.upsert({
        where: { user_id: userId },
        update: {
          address: data.address,
          address_line_2: data.address_line_2,
          zipCode: data.zipCode,
          country_id: data.countryId,
          state_id: data.stateId,
          city: data.city,
          website: data.website,
          links: data.links || [],
        },
        create: {
          user_id: userId,
          unique_id: ulid(),
          address: data.address,
          address_line_2: data.address_line_2,
          zipCode: data.zipCode,
          country_id: data.countryId,
          state_id: data.stateId,
          city: data.city,
          website: data.website,
          links: data.links || [],
        },
        include: {
          country: true,
          state: true,
        },
      });

      return {
        success: true,
        message: 'Personal information updated successfully',
        data: profile,
      };
    } catch (error: any) {
      console.error('Update Personal Info Error:', error);
      return {
        success: false,
        message: 'Failed to update personal information',
      };
    }
  }

  /**
   * Update hourly rate
   */
  static async updateHourlyRate(userId: number, data: HourlyRateInput): Promise<ServiceResponse> {
    try {
      // Update hourly rate in UserProfile
      const profile = await prisma.personalInfo.upsert({
        where: { user_id: userId },
        update: {
          hourly_rate: data.hourly_rate,
        },
        create: {
          user_id: userId,
          unique_id: ulid(),
          hourly_rate: data.hourly_rate,
        },
      });

      // Update currency on User table
      await prisma.user.update({
        where: { id: userId },
        data: {
          currency_id: data.currency_id,
        },
      });

      return {
        success: true,
        message: 'Hourly rate updated successfully',
        data: profile,
      };
    } catch (error: any) {
      console.error('Update Hourly Rate Error:', error);
      return {
        success: false,
        message: 'Failed to update hourly rate',
      };
    }
  }

  /**
   * Update languages
   */
  static async updateLanguages(userId: number, languages: any[]): Promise<ServiceResponse> {
    try {
      const profile = await prisma.personalInfo.upsert({
        where: { user_id: userId },
        update: {
          languages: languages,
        },
        create: {
          user_id: userId,
          unique_id: ulid(),
          languages: languages,
        },
      });

      return {
        success: true,
        message: 'Languages updated successfully',
        data: profile,
      };
    } catch (error: any) {
      console.error('Update Languages Error:', error);
      return {
        success: false,
        message: 'Failed to update languages',
      };
    }
  }

  /**
   * Upload profile image
   */
  static async uploadProfileImage(userId: number, file: any, profileType: string = 'freelancer'): Promise<ServiceResponse> {
    try {
      const relativePath = getRelativePath(file.path);

      // Route to correct profile table based on profileType
      let profile;
      if (profileType === 'freelancer') {
        profile = await prisma.personalInfo.upsert({
          where: { user_id: userId },
          update: { profileImage: relativePath },
          create: {
            user_id: userId,
            unique_id: ulid(),
            profileImage: relativePath,
          },
        });
      } else if (profileType === 'founder') {
        profile = await prisma.companyProfile.upsert({
          where: { user_id: userId },
          update: { profileImage: relativePath },
          create: {
            user_id: userId,
            unique_id: ulid(),
            profileImage: relativePath,
          },
        });
      } else {
        return {
          success: false,
          message: 'Invalid profile type',
        };
      }

      return {
        success: true,
        message: 'Profile image uploaded successfully',
        data: {
          profileImage: getFileUrl(relativePath),
        },
      };
    } catch (error: any) {
      console.error('Upload Profile Image Error:', error);
      return {
        success: false,
        message: 'Failed to upload profile image',
      };
    }
  }

  /**
   * Upload cover image
   */
  static async uploadCoverImage(userId: number, file: any, profileType: string = 'freelancer'): Promise<ServiceResponse> {
    try {
      const relativePath = getRelativePath(file.path);

      // Route to correct profile table based on profileType
      let profile;
      if (profileType === 'freelancer') {
        profile = await prisma.personalInfo.upsert({
          where: { user_id: userId },
          update: { coverImage: relativePath },
          create: {
            user_id: userId,
            unique_id: ulid(),
            coverImage: relativePath,
          },
        });
      } else if (profileType === 'founder') {
        profile = await prisma.companyProfile.upsert({
          where: { user_id: userId },
          update: { coverImage: relativePath },
          create: {
            user_id: userId,
            unique_id: ulid(),
            coverImage: relativePath,
          },
        });
      } else {
        return {
          success: false,
          message: 'Invalid profile type',
        };
      }

      return {
        success: true,
        message: 'Cover image uploaded successfully',
        data: {
          coverImage: getFileUrl(relativePath),
        },
      };
    } catch (error: any) {
      console.error('Upload Cover Image Error:', error);
      return {
        success: false,
        message: 'Failed to upload cover image',
      };
    }
  }

  /**
   * Update privacy settings
   */
  static async updatePrivacySettings(
    userId: number,
    hideEmail?: boolean,
    hidePhone?: boolean
  ): Promise<ServiceResponse> {
    try {
      const updateData: any = {};
      if (hideEmail !== undefined) updateData.hideEmail = hideEmail;
      if (hidePhone !== undefined) updateData.hidePhone = hidePhone;

      const profile = await prisma.personalInfo.upsert({
        where: { user_id: userId },
        update: updateData,
        create: {
          user_id: userId,
          unique_id: ulid(),
          ...updateData,
        },
      });

      return {
        success: true,
        message: 'Privacy settings updated successfully',
        data: profile,
      };
    } catch (error: any) {
      console.error('Update Privacy Settings Error:', error);
      return {
        success: false,
        message: 'Failed to update privacy settings',
      };
    }
  }

  /**
   * Update agency settings (show_as_agency in User table)
   */
  static async updateAgencySettings(
    userId: number,
    show_as_agency: boolean
  ): Promise<ServiceResponse> {
    try {
      // Update the User table, not UserProfile
      const user = await prisma.user.update({
        where: { id: userId },
        data: { show_as_agency },
      });

      return {
        success: true,
        message: 'Agency settings updated successfully',
        data: user,
      };
    } catch (error: any) {
      console.error('Update Agency Settings Error:', error);
      return {
        success: false,
        message: 'Failed to update agency settings',
      };
    }
  }
}
