import { prisma } from '@services/prismaService';
import { ServiceResponse } from '@utils/ApiResponse';
import { ulid } from 'ulid';
import { getDisplayName } from '@utils/General';
import { Log } from '@services/loggerService';
import { resolveAttachmentUrl, createAttachment, urlOrPathToAttachmentId } from '@services/attachmentService';
import { createRedirectLink } from '@services/redirectLinkService';
import type { AttachmentMetaItem } from '@middleware/fileupload';

/**
 * CompanyProfileService
 * Handles all company/founder-specific profile operations
 */
export class CompanyProfileService {
  /**
   * Get company profile by user ID
   */
  static async getMyProfile(userId: number): Promise<ServiceResponse> {
    try {
      const profileInclude = {
        user: {
          include: {
            currency: true,
          },
        },
        country: true,
        state: true,
        branchCountry: true,
        branchState: true,
        industry: true,
        subIndustry: true,
      };

      let profile = await prisma.companyProfile.findUnique({
        where: { user_id: userId },
        include: profileInclude,
      });

      // Auto-create profile if it doesn't exist
      if (!profile) {
        profile = await prisma.companyProfile.create({
          data: {
            user_id: userId,
            unique_id: ulid(),
          },
          include: profileInclude,
        });
      }

      // Transform data for response
      const companyDetail = {
        id: profile.id,
        unique_id: profile.unique_id,
        profile_type: 'founder',
        profileImage: profile.profileImage ? await resolveAttachmentUrl(profile.profileImage, 'profile_image') : null,
        coverImage: profile.coverImage ? await resolveAttachmentUrl(profile.coverImage, 'cover_image') : null,
        
        // Company info
        company_name: profile.company_name,
        company_description: profile.company_description,
        company_website: profile.company_website,
        cin: profile.cin ?? null,
        is_registered: profile.is_registered,
        company_size: profile.company_size,
        founded_year: profile.founded_year,
        industry_id: profile.industry_id,
        sub_industry_id: profile.sub_industry_id,
        industry: profile.industry,
        subIndustry: profile.subIndustry,
        company_stage: profile.company_stage,
        business_model: profile.business_model,
        team_size: profile.team_size,

        // Business model
        revenue_description: profile.revenue_description,
        revenueModels: profile.revenue_models || [],
        target_market: profile.target_market,
        problem_statement: profile.problem_statement,
        solution_statement: profile.solution_statement,

        // Traction
        traction_title: profile.traction_title,
        traction_document:  await resolveAttachmentUrl(profile.traction_document, 'traction_document'),
        // Funding
        funding_status: profile.funding_status,
        total_funding: profile.total_funding,

        // Headquarters location
        address: profile.address,
        address_line_2: profile.address_line_2,
        city: profile.city,
        zipCode: profile.zipCode,
        country: profile.country,
        state: profile.state,

        // Branch office
        is_branch_same_as_hq: profile.is_branch_same_as_hq,
        branch_address: profile.branch_address,
        branch_address_line_2: profile.branch_address_line_2,
        branch_city: profile.branch_city,
        branch_zipCode: profile.branch_zipCode,
        branch_country: profile.branchCountry,
        branch_state: profile.branchState,

        // Social links
        links: profile.links,

        // Relations
        currency: profile.user.currency,

        // User data
        ...getDisplayName(
          profile.user as { first_name: string; last_name?: string | null; is_deactivated?: boolean },
          { maskLastName: false }
        ),
        email: profile.user.email,
        phone: profile.user.phone,
        emailVerified: !!profile.user.email_verified_at,
        phoneVerified: !!profile.user.phone_verified_at,
      };

      return {
        success: true,
        message: 'Company profile retrieved successfully',
        data: companyDetail,
      };
    } catch (error: any) {
      Log.error("Error", { error });
      return {
        success: false,
        message: 'Failed to retrieve company profile',
      };
    }
  }

  /**
   * Get public company profile by founder unique_id (no auth)
   */
  static async getPublicByUniqueId(uniqueId: string): Promise<ServiceResponse> {
    try {
      const user = await prisma.user.findUnique({
        where: { unique_id: uniqueId },
      });
      if (!user) {
        return { success: false, message: 'Founder not found' };
      }
      if ((user as { is_deactivated?: boolean }).is_deactivated) {
        return { success: false, message: 'Company profile not found' };
      }

      const profile = await prisma.companyProfile.findUnique({
        where: { user_id: user.id },
        include: {
          user: { include: { currency: true } },
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

      if (!profile) {
        return { success: false, message: 'Company profile not found' };
      }

      const totalFundingNum = profile.total_funding != null ? Number(profile.total_funding) : null;
      const fundingRounds = (profile.fundingRounds || []).map((r) => ({
        id: r.id,
        investor_name: r.investor_name,
        funding_stage: r.funding_stage,
        funding_amount: Number(r.funding_amount),
        funding_date: r.funding_date.toISOString(),
        funding_valuation: r.funding_valuation != null ? Number(r.funding_valuation) : null,
      }));

      const companyDetail = {
        id: profile.id,
        unique_id: profile.unique_id,
        profile_type: 'founder',
        profileImage: profile.profileImage ? await resolveAttachmentUrl(profile.profileImage, 'profile_image') : null,
        coverImage: profile.coverImage ? await resolveAttachmentUrl(profile.coverImage, 'cover_image') : null,
        company_name: profile.company_name,
        company_description: profile.company_description,
        company_website: profile.company_website,
        cin: profile.cin ?? null,
        is_registered: profile.is_registered,
        company_size: profile.company_size,
        founded_year: profile.founded_year,
        industry_id: profile.industry_id,
        sub_industry_id: profile.sub_industry_id,
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
        // Headquarters location
        address: profile.address,
        address_line_2: profile.address_line_2,
        city: profile.city,
        zipCode: profile.zipCode,
        country: profile.country,
        state: profile.state,
        // Branch office
        is_branch_same_as_hq: profile.is_branch_same_as_hq,
        branch_address: profile.branch_address,
        branch_address_line_2: profile.branch_address_line_2,
        branch_city: profile.branch_city,
        branch_zipCode: profile.branch_zipCode,
        branch_country: profile.branchCountry,
        branch_state: profile.branchState,
        links: profile.links,
        currency: profile.user.currency,
        ...getDisplayName(
          profile.user as { first_name: string; last_name?: string | null; is_deactivated?: boolean },
          { maskLastName: true }
        ),
        email: null,
        phone: null,
        emailVerified: false,
        phoneVerified: false,
      };

      return {
        success: true,
        message: 'Company profile retrieved successfully',
        data: companyDetail,
      };
    } catch (error: any) {
      Log.error("Error", { error });
      return { success: false, message: 'Failed to retrieve company profile' };
    }
  }

  static async uploadProfileImage(userId: number, file: any, attachmentMeta?: AttachmentMetaItem): Promise<ServiceResponse> {
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

      const profile = await prisma.companyProfile.upsert({
        where: { user_id: userId },
        update: { profileImage: valueToStore },
        create: {
          user_id: userId,
          unique_id: ulid(),
          profileImage: valueToStore,
        },
      });

      return {
        success: true,
        message: 'Profile image uploaded successfully',
        data: {
          profileImage: await resolveAttachmentUrl(valueToStore, 'profile_image'),
        },
      };
    } catch (error: any) {
      Log.error("Error", { error });
      return {
        success: false,
        message: 'Failed to upload profile image',
      };
    }
  }

  static async uploadCoverImage(userId: number, file: any, attachmentMeta?: AttachmentMetaItem): Promise<ServiceResponse> {
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

      const profile = await prisma.companyProfile.upsert({
        where: { user_id: userId },
        update: { coverImage: valueToStore },
        create: {
          user_id: userId,
          unique_id: ulid(),
          coverImage: valueToStore,
        },
      });

      return {
        success: true,
        message: 'Cover image uploaded successfully',
        data: {
          coverImage: await resolveAttachmentUrl(valueToStore, 'cover_image'),
        },
      };
    } catch (error: any) {
      Log.error("Error", { error });
      return {
        success: false,
        message: 'Failed to upload cover image',
      };
    }
  }

  /**
   * Update company overview (includes company info and location)
   */
  static async updateOverview(userId: number, data: {
    company_name?: string;
    company_description?: string;
    cin?: string;
    is_registered?: boolean;
    company_website?: string;
    founded_year?: number;
    company_size?: string;
    address?: string;
    address_line_2?: string;
    city?: string;
    zipCode?: string;
    country_id?: number;
    state_id?: number;
    is_branch_same_as_hq?: boolean;
    branch_address?: string;
    branch_address_line_2?: string;
    branch_city?: string;
    branch_zipCode?: string;
    branch_country_id?: number;
    branch_state_id?: number;
  }): Promise<ServiceResponse> {
    try {
      // Normalize company_website: if it doesn't have protocol, prepend https://
      const profileData = { ...data };
      if (profileData.company_website && profileData.company_website !== '') {
        const website = profileData.company_website.trim();
        if (!/^https?:\/\//i.test(website)) {
          profileData.company_website = `https://${website}`;
        }
      }

      // If branch is same as HQ, copy HQ location to branch fields
      if (profileData.is_branch_same_as_hq === true) {
        profileData.branch_address = profileData.address ?? undefined;
        profileData.branch_address_line_2 = profileData.address_line_2 ?? undefined;
        profileData.branch_city = profileData.city ?? undefined;
        profileData.branch_zipCode = profileData.zipCode ?? undefined;
        profileData.branch_country_id = profileData.country_id ?? undefined;
        profileData.branch_state_id = profileData.state_id ?? undefined;
      }

      // Filter out undefined and NaN so we don't overwrite with invalid values
      const filteredProfileData = Object.fromEntries(
        Object.entries(profileData).filter(([key, value]) => {
          if (value === undefined) return false;
          if (typeof value === 'number' && Number.isNaN(value)) return false;
          return true;
        })
      ) as typeof profileData;

      // Update company profile
      const profile = await prisma.companyProfile.upsert({
        where: { user_id: userId },
        update: filteredProfileData,
        create: {
          user_id: userId,
          unique_id: ulid(),
          ...filteredProfileData,
        },
        include: {
          user: {
            include: {
              currency: true,
            },
          },
          country: true,
          state: true,
          branchCountry: true,
          branchState: true,
          industry: true,
          subIndustry: true,
        },
      });


      const revenueModels = profile.revenue_models || [];

      // Transform data for response (same structure as getMyProfile)
      const companyDetail = {
        id: profile.id,
        unique_id: profile.unique_id,
        profile_type: 'founder',
        profileImage: profile.profileImage ? await resolveAttachmentUrl(profile.profileImage, 'profile_image') : null,
        coverImage: profile.coverImage ? await resolveAttachmentUrl(profile.coverImage, 'cover_image') : null,

        // Company info
        company_name: profile.company_name,
        company_description: profile.company_description,
        company_website: profile.company_website,
        cin: profile.cin ?? null,
        is_registered: profile.is_registered,
        company_size: profile.company_size,
        founded_year: profile.founded_year,
        industry_id: profile.industry_id,
        sub_industry_id: profile.sub_industry_id,
        industry: profile.industry,
        subIndustry: profile.subIndustry,
        company_stage: profile.company_stage,
        business_model: profile.business_model,
        team_size: profile.team_size,

        // Business model
        revenue_description: profile.revenue_description,
        revenueModels: revenueModels,
        target_market: profile.target_market,
        problem_statement: profile.problem_statement,
        solution_statement: profile.solution_statement,

        // Traction
        traction_title: profile.traction_title,
        traction_document: await resolveAttachmentUrl(profile.traction_document, 'traction_document'),

        // Funding
        funding_status: profile.funding_status,
        total_funding: profile.total_funding,

        // Headquarters location
        address: profile.address,
        address_line_2: profile.address_line_2,
        city: profile.city,
        zipCode: profile.zipCode,
        country: profile.country,
        state: profile.state,

        // Branch office
        is_branch_same_as_hq: profile.is_branch_same_as_hq,
        branch_address: profile.branch_address,
        branch_address_line_2: profile.branch_address_line_2,
        branch_city: profile.branch_city,
        branch_zipCode: profile.branch_zipCode,
        branch_country: profile.branchCountry,
        branch_state: profile.branchState,

        // Social links
        links: profile.links,

        // Relations
        currency: profile.user.currency,

        // User data
        ...getDisplayName(
          profile.user as { first_name: string; last_name?: string | null; is_deactivated?: boolean },
          { maskLastName: false }
        ),
        email: profile.user.email,
        phone: profile.user.phone,
        emailVerified: !!profile.user.email_verified_at,
        phoneVerified: !!profile.user.phone_verified_at,
      };

      return {
        success: true,
        message: 'Company overview updated successfully',
        data: companyDetail,
      };
    } catch (error: any) {
      Log.error("Error", { error });
      return {
        success: false,
        message: 'Failed to update company overview',
      };
    }
  }

  /**
   * Update company details (location, size, stage, etc.)
   */
  static async updateDetails(userId: number, data: {
    company_size?: string;
    company_stage?: string;
    business_model?: string;
    team_size?: number;
    address?: string;
    city?: string;
    zipCode?: string;
    country_id?: number;
    state_id?: number;
    industry_id?: number;
    sub_industry_id?: number;
  }): Promise<ServiceResponse> {
    try {
      const profile = await prisma.companyProfile.upsert({
        where: { user_id: userId },
        update: data,
        create: {
          user_id: userId,
          unique_id: ulid(),
          ...data,
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

      return {
        success: true,
        message: 'Company details updated successfully',
        data: profile,
      };
    } catch (error: any) {
      Log.error("Error", { error });
      return {
        success: false,
        message: 'Failed to update company details',
      };
    }
  }

  /**
   * Update funding information
   */
  static async updateFunding(userId: number, data: {
    funding_status?: string;
    total_funding?: number;
  }): Promise<ServiceResponse> {
    try {
      const profile = await prisma.companyProfile.upsert({
        where: { user_id: userId },
        update: data,
        create: {
          user_id: userId,
          unique_id: ulid(),
          ...data,
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

      return {
        success: true,
        message: 'Funding information updated successfully',
        data: profile,
      };
    } catch (error: any) {
      Log.error("Error", { error });
      return {
        success: false,
        message: 'Failed to update funding information',
      };
    }
  }

  /**
   * Update problem and solution statements
   */
  static async updateProblemSolution(userId: number, data: {
    problem_statement?: string;
    solution_statement?: string;
  }): Promise<ServiceResponse> {
    try {
      const profile = await prisma.companyProfile.upsert({
        where: { user_id: userId },
        update: data,
        create: {
          user_id: userId,
          unique_id: ulid(),
          ...data,
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

      return {
        success: true,
        message: 'Problem and solution updated successfully',
        data: profile,
      };
    } catch (error: any) {
      Log.error("Error", { error });
      return {
        success: false,
        message: 'Failed to update problem and solution',
      };
    }
  }

  /**
   * Update target market
   */
  static async updateTargetMarket(userId: number, data: {
    target_market?: string;
  }): Promise<ServiceResponse> {
    try {
      const profile = await prisma.companyProfile.upsert({
        where: { user_id: userId },
        update: data,
        create: {
          user_id: userId,
          unique_id: ulid(),
          ...data,
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

      return {
        success: true,
        message: 'Target market updated successfully',
        data: profile,
      };
    } catch (error: any) {
      Log.error("Error", { error });
      return {
        success: false,
        message: 'Failed to update target market',
      };
    }
  }

  /**
   * Update revenue model
   */
  static async updateRevenueModel(userId: number, data: {
    revenue_models?: any[];
    revenue_description?: string | null;
  }): Promise<ServiceResponse> {
    try {
      const updateData: any = {};

      if (data.revenue_description !== undefined) {
        updateData.revenue_description = data.revenue_description;
      }

      if (data.revenue_models !== undefined) {
        updateData.revenue_models = data.revenue_models || [];
      }

      // Update or create profile
      const updatedProfile = await prisma.companyProfile.upsert({
        where: { user_id: userId },
        update: updateData,
        create: {
          user_id: userId,
          unique_id: ulid(),
          ...updateData,
        },
        include: {
          user: {
            include: {
              currency: true,
            },
          },
          country: true,
          state: true,
          industry: true,
          subIndustry: true,
        },
      });

      const revenueModels = updatedProfile.revenue_models || [];

      return {
        success: true,
        message: 'Revenue model updated successfully',
        data: {
          ...updatedProfile,
          revenueModels: Array.isArray(revenueModels) && revenueModels.length > 0 ? revenueModels : null,
        },
      };
    } catch (error: any) {
      Log.error("Error", { error });
      return {
        success: false,
        message: 'Failed to update revenue model',
      };
    }
  }

  /**
   * Update traction
   */
  static async updateTraction(userId: number, data: {
    traction_title?: string | null;
    traction_document?: string | null;
  }): Promise<ServiceResponse> {
    try {
      // Prepare update data
      const updateData: any = {};
      
      if (data.traction_title !== undefined) {
        updateData.traction_title = data.traction_title;
      }
      
      if (data.traction_document !== undefined) {
        // Store only the attachment unique_id, not the full URL
        const rawDoc = data.traction_document;
        if (rawDoc) {
          updateData.traction_document = urlOrPathToAttachmentId(rawDoc) || rawDoc;
        } else {
          updateData.traction_document = null;
        }
      }

      // Update or create profile
      const updatedProfile = await prisma.companyProfile.upsert({
        where: { user_id: userId },
        update: updateData,
        create: {
          user_id: userId,
          unique_id: ulid(),
          ...updateData,
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

      return {
        success: true,
        message: 'Traction updated successfully',
        data: updatedProfile,
      };
    } catch (error: any) {
      Log.error("Error", { error });
      return {
        success: false,
        message: 'Failed to update traction',
      };
    }
  }

  /**
   * Get pitch deck data
   */
  static async getPitchDeck(userId: number): Promise<ServiceResponse> {
    try {
      const profile = await prisma.companyProfile.findUnique({
        where: { user_id: userId },
        select: {
          founders_video_url: true,
          cap_table_url: true,
          cap_table_file: true,
          product_demo_url: true
        }
      });

      if (!profile) {
        return { success: false, message: 'Company profile not found' };
      }

      const [capTableFileResolved, foundersVideoRedirect, capTableUrlRedirect, productDemoRedirect] = await Promise.all([
        profile.cap_table_file ? resolveAttachmentUrl(profile.cap_table_file, 'company_cap_table') : Promise.resolve(null),
        this.createPitchDeckRedirect(profile.founders_video_url, 'pitch_deck_video', userId),
        this.createPitchDeckRedirect(profile.cap_table_url, 'pitch_deck_cap_table', userId),
        this.createPitchDeckRedirect(profile.product_demo_url, 'pitch_deck_demo', userId),
      ]);

      // If attachment resolution failed but we have the raw value, keep it
      const capTableFileUrl = capTableFileResolved || (profile.cap_table_file?.startsWith('http') ? profile.cap_table_file : null);

      return {
        success: true,
        message: 'Pitch deck retrieved successfully',
        data: {
          founders_video_url: profile.founders_video_url,
          founders_video_redirect: foundersVideoRedirect,
          cap_table_url: profile.cap_table_url,
          cap_table_url_redirect: capTableUrlRedirect,
          cap_table_file: capTableFileUrl,
          cap_table_file_id: profile.cap_table_file,
          product_demo_url: profile.product_demo_url,
          product_demo_redirect: productDemoRedirect
        }
      };
    } catch (error: any) {
      Log.error("Error", { error });
      return { success: false, message: 'Failed to retrieve pitch deck' };
    }
  }


  private static async createPitchDeckRedirect(url: string | null | undefined, entityType: string, userId: number): Promise<string | null> {
    if (!url?.trim()) return null;
    if (url.includes('/r/')) return url; // Already a redirect link
    return createRedirectLink(url, { entityType, createdBy: userId });
  }

  static async updatePitchDeck(userId: number, data: {
    founders_video_url?: string;
    cap_table_url?: string;
    cap_table_file?: string;
    product_demo_url?: string;
  }): Promise<ServiceResponse> {
    try {
      // Create redirect links for URLs
      const [foundersVideoRedirect, capTableUrlRedirect, productDemoRedirect] = await Promise.all([
        this.createPitchDeckRedirect(data.founders_video_url, 'pitch_deck_video', userId),
        this.createPitchDeckRedirect(data.cap_table_url, 'pitch_deck_cap_table', userId),
        this.createPitchDeckRedirect(data.product_demo_url, 'pitch_deck_demo', userId),
      ]);

      const profile = await prisma.companyProfile.upsert({
        where: { user_id: userId },
        update: {
          founders_video_url: data.founders_video_url ?? null,
          cap_table_url: data.cap_table_url ?? null,
          cap_table_file: data.cap_table_file ?? null,
          product_demo_url: data.product_demo_url ?? null
        },
        create: {
          user_id: userId,
          unique_id: ulid(),
          founders_video_url: data.founders_video_url ?? null,
          cap_table_url: data.cap_table_url ?? null,
          cap_table_file: data.cap_table_file ?? null,
          product_demo_url: data.product_demo_url ?? null
        }
      });

      const capTableFileResolved = profile.cap_table_file
        ? await resolveAttachmentUrl(profile.cap_table_file, 'company_cap_table')
        : null;
      const capTableFileUrl = capTableFileResolved || (profile.cap_table_file?.startsWith('http') ? profile.cap_table_file : null);

      return {
        success: true,
        message: 'Pitch deck updated successfully',
        data: {
          founders_video_url: profile.founders_video_url,
          founders_video_redirect: foundersVideoRedirect,
          cap_table_url: profile.cap_table_url,
          cap_table_url_redirect: capTableUrlRedirect,
          cap_table_file: capTableFileUrl,
          cap_table_file_id: profile.cap_table_file,
          product_demo_url: profile.product_demo_url,
          product_demo_redirect: productDemoRedirect
        }
      };
    } catch (error: any) {
      Log.error("Error", { error });
      return { success: false, message: 'Failed to update pitch deck' };
    }
  }

  static async uploadTractionDocument(userId: number, file: any, traction_title?: string, attachmentMeta?: AttachmentMetaItem): Promise<ServiceResponse> {
    try {
      const updateData: any = {};

      if (file) {
        if (!attachmentMeta) {
          return { success: false, message: 'Attachment flow required' };
        }
        const created = await createAttachment({
          ownerUserId: userId,
          uploadedByUserId: userId,
          path: attachmentMeta.path,
          disk: 'bunny',
          visibility: 'private',
          mimeType: attachmentMeta.mimeType,
          sizeBytes: attachmentMeta.size ?? (file as any)?.size,
        originalName: attachmentMeta.originalName,
        status: 'attached',
        });
        if (!created) {
          return { success: false, message: 'Failed to create attachment' };
        }
        updateData.traction_document = created.unique_id;
      }

      if (traction_title !== undefined) {
        updateData.traction_title = traction_title;
      }

      const profile = await prisma.companyProfile.upsert({
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
        message: 'Traction updated successfully',
        data: {
          traction_title: profile.traction_title,
          traction_document: await resolveAttachmentUrl(profile.traction_document, 'traction_document'),
        },
      };
    } catch (error: any) {
      Log.error("Error", { error });
      return {
        success: false,
        message: 'Failed to upload traction document',
      };
    }
  }
}
