import bcrypt from 'bcrypt';
import type { Request } from 'express';
import { prisma } from '@services/prismaService';
import { Log } from '@services/loggerService';
import { ServiceResponse } from '@utils/ApiResponse';
import { assertNotReused, recordPasswordChange } from '@module/auth/PasswordHistoryService';
import { notifySensitiveUpdate } from '@utils/sensitiveUpdateNotifier';
import { getDisplayName } from '@utils/General';
import { resolveAttachmentUrl, resolveAttachmentUrls, createAttachment } from '@services/attachmentService';
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
          successStories: { orderBy: [{ date: 'desc' }, { created_at: 'desc' }] },
        },
      });

      if (!user) {
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

      // Resolve success story media URLs
      const successStoriesWithUrls = await Promise.all(
        (user.successStories || []).map(async (story) => ({
          ...story,
          media_files: Array.isArray(story.media_files)
            ? await resolveAttachmentUrls(story.media_files as string[], 'success_story_media')
            : []
        }))
      );

      // Personal profile tab (common for all roles)
      const personalProfile = {
        id: user.id,
        unique_id: user.unique_id,
        profileImage: profile?.profileImage ? await resolveAttachmentUrl(profile.profileImage, 'profile_image') : null,
        coverImage: profile?.coverImage ? await resolveAttachmentUrl(profile.coverImage, 'cover_image') : null,
        title: profile?.title ?? null,
        about: profile?.about ?? null,
        city: profile?.city ?? null,
        website: profile?.website ?? null,
        hourly_rate: profile?.hourly_rate ?? null,
        available_hours_per_week: profile?.available_hours_per_week ?? null,
        links: profile?.links ?? null,
        languages: profile?.languages ?? null,
        country: profile?.country ?? null,
        state: profile?.state ?? null,
        currency: user.currency,
        role: user.role,
        firstName,
        lastName,
        hideEmail: profile?.hideEmail ?? false,
        hidePhone: profile?.hidePhone ?? false,
        show_as_agency: user.show_as_agency,
        identity_verification_status: (user as any).identity_verification_status,
        profile_type: (user as any).profile_type || user.role,
        // Professional sections
        educations: user.education || [],
        workExperiences: user.workExperiences || [],
        userExpertises: enrichedExpertises,
        licenses: user.licenses || [],
        achievements: user.achievements || [],
        successStories: successStoriesWithUrls,
      };

      // Build role-specific tabs
      const tabs: string[] = ['personal'];
      let companyProfile = null;
      let investorProfile = null;

      if (user.role === 'founder') {
        tabs.push('company');
        companyProfile = await this.getFounderCompanyTab(user.id);
      } else if (user.role === 'investor') {
        tabs.push('investor');
        investorProfile = await this.getInvestorTab(user.id);
      }

      return {
        success: true,
        message: 'Public profile retrieved successfully',
        data: {
          tabs,
          personal: personalProfile,
          ...(companyProfile && { company: companyProfile }),
          ...(investorProfile && { investor: investorProfile }),
        },
      };
    } catch (error: any) {
      Log.error('Get Public Profile Error', { error });
      return {
        success: false,
        message: 'Failed to retrieve public profile',
      };
    }
  }

  /** Fetch company profile tab for founder role */
  private static async getFounderCompanyTab(userId: number) {
    const profile = await prisma.companyProfile.findUnique({
      where: { user_id: userId },
      include: {
        country: true,
        state: true,
        branchCountry: true,
        branchState: true,
        industry: true,
        subIndustry: true,
        fundingRounds: {
          where: { deleted_at: null },
          orderBy: { funding_date: 'desc' },
        },
      },
    });

    if (!profile) return null;

    const totalFundingNum = profile.total_funding != null ? Number(profile.total_funding) : null;
    const fundingRounds = (profile.fundingRounds || []).map((r) => ({
      id: r.id,
      investor_name: r.investor_name,
      funding_stage: r.funding_stage,
      funding_amount: Number(r.funding_amount),
      funding_date: r.funding_date.toISOString(),
      funding_valuation: r.funding_valuation != null ? Number(r.funding_valuation) : null,
    }));

    return {
      id: profile.id,
      unique_id: profile.unique_id,
      profileImage: profile.profileImage ? await resolveAttachmentUrl(profile.profileImage, 'profile_image') : null,
      coverImage: profile.coverImage ? await resolveAttachmentUrl(profile.coverImage, 'cover_image') : null,
      company_name: profile.company_name,
      company_description: profile.company_description,
      company_website: profile.company_website,
      cin: profile.cin ?? null,
      is_registered: profile.is_registered,
      company_size: profile.company_size,
      founded_year: profile.founded_year,
      industry: profile.industry,
      subIndustry: profile.subIndustry,
      company_stage: profile.company_stage,
      business_model: profile.business_model,
      team_size: profile.team_size,
      revenue_description: profile.revenue_description,
      revenueModels: profile.revenue_models || [],
      target_market: profile.target_market,
      problem_statement: profile.problem_statement,
      solution_statement: profile.solution_statement,
      traction_title: profile.traction_title,
      traction_document: await resolveAttachmentUrl(profile.traction_document, 'traction_document'),
      funding_status: profile.funding_status,
      total_funding: totalFundingNum,
      fundingRounds,
      address: profile.address,
      city: profile.city,
      zipCode: profile.zipCode,
      country: profile.country,
      state: profile.state,
      is_branch_same_as_hq: profile.is_branch_same_as_hq,
      branch_address: profile.branch_address,
      branch_city: profile.branch_city,
      branch_zipCode: profile.branch_zipCode,
      branch_country: profile.branchCountry,
      branch_state: profile.branchState,
      links: profile.links,
    };
  }

  /** Fetch investment profile tab for investor role */
  private static async getInvestorTab(userId: number) {
    const ip = await (prisma as any).investmentProfile.findUnique({
      where: { user_id: userId },
      include: {
        preferredIndustries: {
          include: { industry: true, subIndustry: true },
          orderBy: { order_index: 'asc' },
        },
        committeeMembers: { orderBy: { order_index: 'asc' } },
        geoPreferences: {
          include: { country: true, state: true },
          orderBy: { order_index: 'asc' },
        },
      },
    });

    if (!ip) return null;

    const committeeMembers = await Promise.all(
      (ip.committeeMembers || []).map(async (m: any) => ({
        id: m.id,
        name: m.name,
        role: m.role,
        roleDescription: m.role_description,
        photo: m.photo ? await resolveAttachmentUrl(m.photo, 'committee_member_photo') : null,
        email: m.hide_email ? null : m.email,
        hideEmail: m.hide_email,
      }))
    );

    return {
      investorTypes: Array.isArray(ip.investor_types) ? ip.investor_types : [],
      thesisSummary: ip.thesis_summary || null,
      diligenceProcess: ip.diligence_process || null,
      diligenceDocument: ip.diligence_document || null,
      investmentSizeMin: ip.investment_size_min != null ? Number(ip.investment_size_min) : null,
      investmentSizeMax: ip.investment_size_max != null ? Number(ip.investment_size_max) : null,
      investmentSizeCurrency: ip.investment_size_currency || null,
      equityRangeMin: ip.equity_range_min != null ? Number(ip.equity_range_min) : null,
      equityRangeMax: ip.equity_range_max != null ? Number(ip.equity_range_max) : null,
      preferredIndustries: (ip.preferredIndustries || []).map((pi: any) => ({
        industryName: pi.industry?.name || null,
        subIndustryName: pi.subIndustry?.name || null,
        specialisation: pi.specialisation || null,
        investmentStage: pi.investment_stage || null,
        investmentCriteria: pi.investment_criteria || null,
      })),
      committeeMembers,
      geoPreferences: (ip.geoPreferences || []).map((g: any) => ({
        country: g.country?.name || null,
        state: g.state?.name || null,
      })),
    };
  }

  /** Fetch mentor profile tab for mentor role */
  private static async getMentorTab(userId: number) {
    const mentorOnRequest = await (prisma as any).mentorOnRequest.findUnique({
      where: { user_id: userId },
    });

    const mentorPackages = await prisma.mentorPackage.findMany({
      where: { user_id: userId, status: 'PUBLISHED' },
      select: {
        id: true,
        unique_id: true,
        title: true,
        description: true,
        session_duration: true,
        no_of_sessions: true,
        session_price_amount: true,
        session_price_currency: true,
      },
      orderBy: { created_at: 'desc' },
    });

    const minuteToLabel: Record<number, string> = { 15: '15m', 30: '30m', 45: '45m', 60: '1 hr', 75: '1h 15m', 90: '1h 30m', 105: '1h 45m', 120: '2h' };

    return {
      onRequest: mentorOnRequest ? {
        isAvailable: mentorOnRequest.is_available,
        sessionFrequency: mentorOnRequest.session_frequency ?? [],
        sessionDurationMin: minuteToLabel[mentorOnRequest.session_duration_min] ?? mentorOnRequest.session_duration_min,
        sessionDurationMax: minuteToLabel[mentorOnRequest.session_duration_max] ?? mentorOnRequest.session_duration_max,
        priceAmount: mentorOnRequest.price_amount != null ? Number(mentorOnRequest.price_amount) : null,
        priceCurrency: mentorOnRequest.price_currency || 'INR',
        discountEnabled: mentorOnRequest.discount_enabled,
        discountTitle: mentorOnRequest.discount_title || '',
        discountPercent: mentorOnRequest.discount_percent,
        discountAvailableTill: mentorOnRequest.discount_available_till,
      } : null,
      mentorPackages: mentorPackages.map((pkg: any) => ({
        id: pkg.id,
        uniqueId: pkg.unique_id,
        title: pkg.title,
        description: pkg.description,
        sessionDuration: pkg.session_duration,
        noOfSessions: pkg.no_of_sessions,
        price: pkg.session_price_amount != null ? Number(pkg.session_price_amount) : null,
        currency: pkg.session_price_currency || 'INR',
      })),
    };
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
        dob: profile.user.dob || null,
        gender: profile.user.gender || null,
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
      // dob + gender live on the User table (collected in the same Personal
      // Info modal but not a column on PersonalInfo). Only write when the
      // client explicitly sent the field so a partial update can't blank
      // them out.
      const userPatch: { dob?: string | null; gender?: string | null } = {};
      if (data.dob !== undefined) userPatch.dob = data.dob ? data.dob.slice(0, 10) : null;
      if (data.gender !== undefined) userPatch.gender = data.gender || null;
      if (Object.keys(userPatch).length > 0) {
        await prisma.user.update({ where: { id: userId }, data: userPatch });
      }
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
  static async setPassword(
    userId: number,
    newPassword: string,
    req?: Request
  ): Promise<ServiceResponse> {
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
      // Even on first set, an OAuth user may have a history row from a
      // previous set→clear cycle; honour the no-reuse rule.
      const reuseCheck = await assertNotReused(userId, null, newPassword);
      if (!reuseCheck.ok) {
        return { success: false, message: reuseCheck.message };
      }
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });
      await recordPasswordChange({ userId, hashedPassword, source: 'set', req });
      void notifySensitiveUpdate(
        userId,
        'A password was added to your account',
        'A password was just set on your ScaleDux account. You can now sign in with your email and password as well as with Google or LinkedIn.',
      );
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
    newPassword: string,
    req?: Request
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
      // Block reuse of the current password or any previously-used password.
      const reuseCheck = await assertNotReused(userId, user.password, newPassword);
      if (!reuseCheck.ok) {
        return { success: false, message: reuseCheck.message };
      }
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });
      await recordPasswordChange({ userId, hashedPassword, source: 'update', req });
      void notifySensitiveUpdate(
        userId,
        'Your password was changed',
        'The password on your ScaleDux account was just changed.',
      );
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
