import bcrypt from 'bcrypt';
import { prisma } from '@services/prismaService';
import { Log } from '@services/loggerService';
import { ServiceResponse } from '@utils/ApiResponse';
import { getDisplayName } from '@utils/General';
import { resolveAttachmentUrl, createAttachment } from '@services/attachmentService';
import type { AttachmentMetaItem } from '@middleware/fileupload';
import { ProfileSummaryInput, PersonalInfoInput, HourlyRateInput, AvailableHoursPerWeekInput } from './ProfileType';
import { updateCompletionSection } from './ProfileCompletionService';
import { getResubmitWindow } from '@utils/General';
import { appConfig } from '@config/app';

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
          education: { orderBy: { created_at: 'desc' } },
          workExperiences: { orderBy: { created_at: 'desc' } },
          expertises: {
            include: {
              category: { select: { id: true, name: true, description: true } },
            },
            orderBy: { created_at: 'desc' },
          },
          licenses: { orderBy: { created_at: 'desc' } },
          achievements: { orderBy: { created_at: 'desc' } },
        },
      });

      if (!user || !user.personalInfo) {
        return {
          success: false,
          message: 'Profile not found',
        };
      }

      if ((user as { is_deactivated?: boolean }).is_deactivated) {
        return {
          success: false,
          message: 'Profile not found',
        };
      }

      const profile = user.personalInfo;
      const { firstName, lastName } = getDisplayName(
        user as { first_name: string; last_name?: string | null; is_deactivated?: boolean },
        { maskLastName: true }
      );

      // Enrich expertises with subcategory details
      const enrichedExpertises = await this.enrichExpertisesWithSpecialties(user.expertises || []);

      // Return public profile data (hide sensitive information)
      const publicProfile = {
        id: profile.id,
        unique_id: user.unique_id,
        profileImage: profile.profileImage ? await resolveAttachmentUrl(profile.profileImage, 'profile_image') : null,
        coverImage: profile.coverImage ? await resolveAttachmentUrl(profile.coverImage, 'cover_image') : null,
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
        firstName,
        lastName,
        hideEmail: profile.hideEmail,
        hidePhone: profile.hidePhone,
        show_as_agency: user.show_as_agency,
        identity_verification_status: (user as any).identity_verification_status,
        profile_type: (user as any).profile_type || user.role,
        // Professional sections
        educations: user.education || [],
        workExperiences: user.workExperiences || [],
        userExpertises: enrichedExpertises,
        licenses: user.licenses || [],
        achievements: user.achievements || [],
      };

      return {
        success: true,
        message: 'Public profile retrieved successfully',
        data: publicProfile,
      };
    } catch (error: any) {
      Log.error('Get Public Profile Error', { error });
      return {
        success: false,
        message: 'Failed to retrieve public profile',
      };
    }
  }

  /** Enrich expertise records with subcategory details resolved from specialty_ids JSON */
  private static async enrichExpertisesWithSpecialties(expertises: any[]) {
    const allIds = new Set<number>();
    for (const e of expertises) {
      const ids = Array.isArray(e.specialty_ids) ? e.specialty_ids : [];
      ids.forEach((id: number) => allIds.add(id));
    }

    if (allIds.size === 0) {
      return expertises.map((e) => ({
        ...e,
        specialties: [],
        subcategory: { id: 0, name: '', description: '' },
      }));
    }

    const subcategories = await prisma.subcategory.findMany({
      where: { id: { in: [...allIds] } },
      select: { id: true, name: true, description: true },
    });
    const subMap = new Map(subcategories.map((s) => [s.id, s]));

    return expertises.map((e) => {
      const ids = Array.isArray(e.specialty_ids) ? e.specialty_ids : [];
      const specialties = ids.map((id: number) => subMap.get(id)).filter(Boolean);
      const firstSub = specialties[0] || { id: 0, name: '', description: '' };
      return { ...e, specialties, subcategory: firstSub };
    });
  }

  /**
   * Get profile by user ID and profile type
   */
  static async getProfileByUserId(userId: number, profileType: string = 'freelancer'): Promise<ServiceResponse> {
    try {
      let profile = await prisma.personalInfo.findUnique({
        where: { user_id: userId },
        include: {
          user: { include: { currency: true } },
          country: true,
          state: true,
        },
      });

      if (!profile) {
        return {
          success: false,
          message: 'Profile not found. Please set your role (PATCH /auth/role) or complete registration.',
        };
      }

      // Combine user account data with profile data (UserDetail = UserProfile + User)
      const userDetail = {
        // Profile data (from PersonalInfo table) - explicitly select fields
        id: profile.user.id,
        unique_id: profile.user.unique_id,
        profileImage: profile.profileImage ? await resolveAttachmentUrl(profile.profileImage, 'profile_image') : null,
        coverImage: profile.coverImage ? await resolveAttachmentUrl(profile.coverImage, 'cover_image') : null,
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
        country: profile.country,
        state: profile.state,
        currency: profile.user.currency,
        role: profile.user.role, // User's role from backend
        ...getDisplayName(
          profile.user as { first_name: string; last_name?: string | null; is_deactivated?: boolean },
          { maskLastName: false }
        ),
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
        profile_completion_percentage: profile.user.profile_completion_percentage ?? 0,
        googleCalendarConnected: !!profile.user.google_calendar_refresh_token,
        googleCalendarEmail: profile.user.google_calendar_email ?? null,
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

      // Cooldown windows (same logic as /verify/identity/status and /verify/agency/status) for /me consumers
      const [lastApprovedIdentity, lastApprovedAgency] = await Promise.all([
        prisma.identityVerification.findFirst({
          where: { user_id: userId, status: 'APPROVED' },
          orderBy: { verified_at: 'desc' },
        }),
        prisma.agencyVerification.findFirst({
          where: { user_id: userId, status: 'APPROVED' },
          orderBy: { verified_at: 'desc' },
        }),
      ]);
      const identityAnchor =
        lastApprovedIdentity?.verified_at ?? profile.user.identity_verified_at ?? null;
      const identityCooldown = getResubmitWindow(identityAnchor, appConfig.verification.identityCooldownDays);
      const agencyAnchor =
        lastApprovedAgency?.verified_at ?? profile.user.agency_verified_at ?? null;
      const agencyCooldown = getResubmitWindow(agencyAnchor, appConfig.verification.agencyCooldownDays);

      const detail = userDetail as Record<string, unknown>;
      detail.identity_next_submit_allowed_at =
        identityCooldown.nextSubmitAllowedAt?.toISOString() ?? null;
      detail.agency_next_submit_allowed_at =
        agencyCooldown.nextSubmitAllowedAt?.toISOString() ?? null;
      detail.identity_verification_cooldown_days = appConfig.verification.identityCooldownDays;
      detail.agency_verification_cooldown_days = appConfig.verification.agencyCooldownDays;

      return {
        success: true,
        message: 'User profile retrieved successfully',
        data: userDetail,
      };
    } catch (error: any) {
      Log.error('Get Freelancer Profile Error', { error });
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
      await updateCompletionSection(userId, 'profileSummary', !!(data.title && data.about));
      return {
        success: true,
        message: 'Profile summary updated successfully',
        data: profile,
      };
    } catch (error: any) {
      Log.error('Update Profile Summary Error', { error });
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
      const personalInfoComplete = !!(profile.address && profile.city && profile.country_id);
      await updateCompletionSection(userId, 'personalInfo', personalInfoComplete);
      return {
        success: true,
        message: 'Personal information updated successfully',
        data: profile,
      };
    } catch (error: any) {
      Log.error('Update Personal Info Error', { error });
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
      await updateCompletionSection(userId, 'hourlyRate', profile.hourly_rate != null);
      return {
        success: true,
        message: 'Hourly rate updated successfully',
        data: profile,
      };
    } catch (error: any) {
      Log.error('Update Hourly Rate Error', { error });
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
      await updateCompletionSection(userId, 'availableHoursPerWeek', profile.available_hours_per_week != null);
      return {
        success: true,
        message: 'Available hours per week updated successfully',
        data: profile,
      };
    } catch (error: any) {
      Log.error('Update Available Hours Per Week Error', { error });
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
      const hasLanguages = Array.isArray(profile.languages) && (profile.languages as any[]).length > 0;
      await updateCompletionSection(userId, 'languages', hasLanguages);
      return {
        success: true,
        message: 'Languages updated successfully',
        data: profile,
      };
    } catch (error: any) {
      Log.error('Update Languages Error', { error });
      return {
        success: false,
        message: 'Failed to update languages',
      };
    }
  }

  static async uploadProfileImage(userId: number, file: any, profileType: string = 'freelancer', attachmentMeta?: AttachmentMetaItem): Promise<ServiceResponse> {
    try {
      if (!attachmentMeta) {
        return { success: false, message: 'Attachment flow required' };
      }
      const created = await createAttachment({
        ownerUserId: userId,
        uploadedByUserId: userId,
        path: attachmentMeta.path,
        disk: 'bunny',
        visibility: 'public',
        mimeType: attachmentMeta.mimeType,
        sizeBytes: attachmentMeta.size ?? (file as any)?.size,
        originalName: attachmentMeta.originalName,
        status: 'attached',
      });
      if (!created) {
        return { success: false, message: 'Failed to create attachment' };
      }
      const valueToStore = created.unique_id;

      await prisma.personalInfo.upsert({
        where: { user_id: userId },
        update: { profileImage: valueToStore },
        create: {
          user_id: userId,
          profileImage: valueToStore,
        },
      });
      await updateCompletionSection(userId, 'profilePicture', true);
      return {
        success: true,
        message: 'Profile image uploaded successfully',
        data: {
          profileImage: await resolveAttachmentUrl(valueToStore, 'profile_image'),
        },
      };
    } catch (error: any) {
      Log.error('Upload Profile Image Error', { error });
      return {
        success: false,
        message: 'Failed to upload profile image',
      };
    }
  }

  static async uploadCoverImage(userId: number, file: any, profileType: string = 'freelancer', attachmentMeta?: AttachmentMetaItem): Promise<ServiceResponse> {
    try {
      if (!attachmentMeta) {
        return { success: false, message: 'Attachment flow required' };
      }
      const created = await createAttachment({
        ownerUserId: userId,
        uploadedByUserId: userId,
        path: attachmentMeta.path,
        disk: 'bunny',
        visibility: 'public',
        mimeType: attachmentMeta.mimeType,
        sizeBytes: attachmentMeta.size ?? (file as any)?.size,
        originalName: attachmentMeta.originalName,
        status: 'attached',
      });
      if (!created) {
        return { success: false, message: 'Failed to create attachment' };
      }
      const valueToStore = created.unique_id;

      await prisma.personalInfo.upsert({
        where: { user_id: userId },
        update: { coverImage: valueToStore },
        create: {
          user_id: userId,
          coverImage: valueToStore,
        },
      });
      await updateCompletionSection(userId, 'profileCover', true);
      return {
        success: true,
        message: 'Cover image uploaded successfully',
        data: {
          coverImage: await resolveAttachmentUrl(valueToStore, 'cover_image'),
        },
      };
    } catch (error: any) {
      Log.error('Upload Cover Image Error', { error });
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
      Log.error('Update Privacy Settings Error', { error });
      return {
        success: false,
        message: 'Failed to update privacy settings',
      };
    }
  }

  /**
   * Get password status for current user (hasPassword, provider).
   * Used by frontend to show "Set password" vs "Change password" form.
   */
  static async getPasswordStatus(userId: number): Promise<ServiceResponse & { data?: { hasPassword: boolean; provider?: string | null } }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { password: true, provider: true },
      });
      if (!user) {
        return { success: false, message: 'User not found' };
      }
      const hasPassword = !!user.password;
      return {
        success: true,
        message: 'OK',
        data: { hasPassword, provider: user.provider ?? undefined },
      };
    } catch (error: any) {
      Log.error('Get Password Status Error', { error });
      return { success: false, message: 'Failed to get password status' };
    }
  }

  /**
   * Set password for users who have none (e.g. signed up via Google/LinkedIn).
   * Allowed only when provider is 'google' or 'linkedin' and password is null.
   */
  static async setPassword(userId: number, newPassword: string): Promise<ServiceResponse> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, password: true, provider: true },
      });
      if (!user) {
        return { success: false, message: 'User not found' };
      }
      if (user.password) {
        return { success: false, message: 'You already have a password. Use change password instead.' };
      }
      const provider = (user.provider || '').toLowerCase();
      if (provider !== 'google' && provider !== 'linkedin') {
        return { success: false, message: 'Set password is only available for Google or LinkedIn sign-in accounts.' };
      }
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });
      return {
        success: true,
        message: 'Password set successfully',
        data: null,
      };
    } catch (error: any) {
      Log.error('Set Password Error', { error });
      return { success: false, message: 'Failed to set password' };
    }
  }

  /**
   * Verify user password (for sensitive actions like deactivate/delete).
   * Returns success: false with message if no password set or password incorrect.
   */
  static async verifyPassword(userId: number, password: string): Promise<ServiceResponse> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, password: true },
      });
      if (!user) return { success: false, message: 'User not found' };
      if (!user.password) {
        return { success: false, message: 'Please set a password first. You signed in with Google or LinkedIn.' };
      }
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return { success: false, message: 'Incorrect password' };
      return { success: true, message: 'OK', data: null };
    } catch (error: any) {
      Log.error('Verify Password Error', { error });
      return { success: false, message: 'Failed to verify password' };
    }
  }

  /**
   * Update user password (current password required).
   */
  static async updatePassword(
    userId: number,
    currentPassword: string,
    newPassword: string
  ): Promise<ServiceResponse> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, password: true },
      });
      if (!user) {
        return { success: false, message: 'User not found' };
      }
      if (!user.password) {
        return { success: false, message: 'Password change not available for this account' };
      }
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) {
        return { success: false, message: 'Current password is incorrect' };
      }
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });
      return {
        success: true,
        message: 'Password updated successfully',
        data: null,
      };
    } catch (error: any) {
      Log.error('Update Password Error', { error });
      return {
        success: false,
        message: 'Failed to update password',
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
      Log.error('Update Agency Settings Error', { error });
      return {
        success: false,
        message: 'Failed to update agency settings',
      };
    }
  }
}
