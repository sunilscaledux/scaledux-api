import { prisma } from '@services/prismaService';
import { ServiceResponse } from '@utils/ApiResponse';
import { getFileUrl, getRelativePath } from '@utils/General';
import { ProfileSummaryInput, PersonalInfoInput, HourlyRateInput, AvailableHoursPerWeekInput } from './ProfileType';
import { ulid } from 'ulid';

/**
 * PersonalInfoService
 * Handles personalInfo operations for all user types (freelancer, founder, mentor, investor)
 */
export class PersonalInfoService {
  /**
   * Get profile by unique_id (for public profile viewing)
   */
  static async getProfileByUniqueId(uniqueId: string): Promise<ServiceResponse> {
    try {
      // Find user by unique_id first (since unique_id is now in User model)
      const user = await prisma.user.findUnique({
        where: { unique_id: uniqueId },
        include: {
          currency: true,
          personalInfo: {
            include: {
              country: true,
              state: true,
            },
          },
        },
      });

      if (!user || !user.personalInfo) {
        return {
          success: false,
          message: 'Profile not found',
        };
      }

      const profile = user.personalInfo;

      // Return public profile data (hide sensitive information)
      const publicProfile = {
        id: profile.id,
        unique_id: user.unique_id,
        profileImage: profile.profileImage ? getFileUrl(profile.profileImage) : null,
        coverImage: profile.coverImage ? getFileUrl(profile.coverImage) : null,
        title: profile.title,
        about: profile.about,
        city: profile.city,
        website: profile.website,
        hourly_rate: profile.hourly_rate,
        available_hours_per_week: profile.available_hours_per_week,
        links: profile.links,
        languages: profile.languages,
        country: profile.country,
        state: profile.state,
        currency: user.currency,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
        // Only show email/phone if not hidden
        email: profile.hideEmail ? null : user.email,
        phone: profile.hidePhone ? null : user.phone,
        show_as_agency: user.show_as_agency,
      };

      return {
        success: true,
        message: 'Public profile retrieved successfully',
        data: publicProfile,
      };
    } catch (error: any) {
      console.error('Get Public Profile Error:', error);
      return {
        success: false,
        message: 'Failed to retrieve public profile',
      };
    }
  }

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
        // Profile data (from PersonalInfo table) - explicitly select fields
        id: profile.user.id,
        unique_id: profile.user.unique_id,
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
        available_hours_per_week: profile.available_hours_per_week,
        links: profile.links,
        languages: profile.languages,
        // Relations
        country: profile.country,
        state: profile.state,
        currency: profile.user.currency,
        // User account data (from User table)
        role: profile.user.role, // User's role from backend
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
      };

      // Include agency name only when agency is verified
      if (profile.user.agency_verification_status === 'APPROVED') {
        const approvedAgency = await prisma.agencyVerification.findFirst({
          where: { user_id: userId, status: 'APPROVED' },
          orderBy: { verified_at: 'desc' },
        });
        if (approvedAgency) {
          (userDetail as Record<string, unknown>).agencyName = approvedAgency.agency_name;
        }
      }

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
   * Update available hours per week (freelancer)
   */
  static async updateAvailableHoursPerWeek(userId: number, data: AvailableHoursPerWeekInput): Promise<ServiceResponse> {
    try {
      const profile = await prisma.personalInfo.upsert({
        where: { user_id: userId },
        update: {
          available_hours_per_week: data.available_hours_per_week,
        },
        create: {
          user_id: userId,
          available_hours_per_week: data.available_hours_per_week,
        },
      });

      return {
        success: true,
        message: 'Available hours per week updated successfully',
        data: profile,
      };
    } catch (error: any) {
      console.error('Update Available Hours Per Week Error:', error);
      return {
        success: false,
        message: 'Failed to update available hours per week',
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

      // Personal profile image: update PersonalInfo for all roles (freelancer, founder, mentor, investor)
      await prisma.personalInfo.upsert({
        where: { user_id: userId },
        update: { profileImage: relativePath },
        create: {
          user_id: userId,
          profileImage: relativePath,
        },
      });

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

      // Personal cover image: update PersonalInfo for all roles (freelancer, founder, mentor, investor)
      await prisma.personalInfo.upsert({
        where: { user_id: userId },
        update: { coverImage: relativePath },
        create: {
          user_id: userId,
          coverImage: relativePath,
        },
      });

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
