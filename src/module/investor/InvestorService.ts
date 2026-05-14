import { prisma } from "@services/prismaService";
import { Log } from "@services/loggerService";
import { ServiceResponse } from "@utils/ApiResponse";
import { resolveAttachmentUrl } from "@services/attachmentService";

export class InvestorService {

  /**
   * Browse investors — public listing with filters.
   */
  static async browseInvestors(params: {
    search?: string;
    investorTypes?: string[];
    industries?: string[];
    businessStages?: string[];
    sortBy?: 'newest' | 'name';
    limit?: number;
    cursor?: string;
  }): Promise<ServiceResponse> {
    try {
      const limit = Math.min(50, Math.max(1, params.limit || 16));
      const cursorDate = params.cursor ? new Date(params.cursor) : null;

      const where: any = {
        role: 'investor',
        status: 1,
        investmentProfile: { isNot: null },
        profile_completion_percentage: { gte: 75 },
      };

      if (params.search?.trim()) {
        const term = params.search.trim();
        where.OR = [
          { first_name: { contains: term, mode: 'insensitive' } },
          { last_name: { contains: term, mode: 'insensitive' } },
          { personalInfo: { is: { title: { contains: term, mode: 'insensitive' } } } },
        ];
      }

      // Filter by investor types (e.g. "Angel investor", "Micro VCs")
      if (params.investorTypes && params.investorTypes.length > 0) {
        where.investmentProfile = {
          ...where.investmentProfile,
          is: {
            ...(where.investmentProfile?.is || {}),
            OR: params.investorTypes.map((t: string) => ({
              investor_types: { array_contains: t }
            })),
          },
        };
      }

      // Filter by preferred industries
      if (params.industries && params.industries.length > 0) {
        where.investmentProfile = {
          ...where.investmentProfile,
          is: {
            ...(where.investmentProfile?.is || {}),
            preferredIndustries: {
              some: {
                industry: {
                  name: { in: params.industries, mode: 'insensitive' }
                }
              }
            }
          },
        };
      }

      // Filter by business stage (investment_stage in preferred industries)
      if (params.businessStages && params.businessStages.length > 0) {
        where.investmentProfile = {
          ...where.investmentProfile,
          is: {
            ...(where.investmentProfile?.is || {}),
            preferredIndustries: {
              some: {
                investment_stage: { in: params.businessStages, mode: 'insensitive' }
              }
            }
          },
        };
      }

      let orderBy: any = { created_at: 'desc' };
      if (params.sortBy === 'name') {
        orderBy = { first_name: 'asc' };
      }

      if (cursorDate) {
        where.created_at = { ...(where.created_at || {}), lt: cursorDate };
      }

      const investors = await (prisma as any).user.findMany({
        where,
        take: limit + 1,
        orderBy,
        select: {
          id: true,
          unique_id: true,
          first_name: true,
          last_name: true,
          role: true,
          created_at: true,
          personalInfo: {
            select: {
              profileImage: true,
              title: true,
              about: true,
              city: true,
              country: { select: { name: true } },
            },
          },
          investmentProfile: {
            select: {
              investor_types: true,
              thesis_summary: true,
              investment_size_min: true,
              investment_size_max: true,
              investment_size_currency: true,
              preferredIndustries: {
                select: {
                  industry: { select: { id: true, name: true } },
                  investment_stage: true,
                },
                take: 5,
              },
            },
          },
        },
      });

      const hasMore = investors.length > limit;
      const slice = hasMore ? investors.slice(0, limit) : investors;

      const data = await Promise.all(
        slice.map(async (investor: any) => {
          const profileImage = investor.personalInfo?.profileImage
            ? await resolveAttachmentUrl(investor.personalInfo.profileImage, 'profile_image')
            : null;

          const investorTypes = investor.investmentProfile?.investor_types;

          return {
            id: investor.id,
            uniqueId: investor.unique_id,
            firstName: investor.first_name,
            lastName: investor.last_name,
            profileImage,
            tagline: investor.personalInfo?.title || null,
            summary: investor.personalInfo?.about
              ? String(investor.personalInfo.about).replace(/<[^>]*>/g, '').slice(0, 150)
              : null,
            city: investor.personalInfo?.city || null,
            country: investor.personalInfo?.country?.name || null,
            investorTypes: Array.isArray(investorTypes) ? investorTypes : [],
            thesisSummary: investor.investmentProfile?.thesis_summary || null,
            investmentSizeMin: investor.investmentProfile?.investment_size_min != null
              ? Number(investor.investmentProfile.investment_size_min) : null,
            investmentSizeMax: investor.investmentProfile?.investment_size_max != null
              ? Number(investor.investmentProfile.investment_size_max) : null,
            investmentSizeCurrency: investor.investmentProfile?.investment_size_currency || null,
            preferredIndustries: (investor.investmentProfile?.preferredIndustries || [])
              .map((pi: any) => pi.industry?.name)
              .filter(Boolean),
          };
        })
      );

      const nextCursor = hasMore && data.length > 0
        ? slice[slice.length - 1].created_at.toISOString()
        : null;

      return {
        success: true,
        message: "Investors fetched successfully",
        data: {
          investors: data,
          nextCursor,
          hasMore,
        },
      };
    } catch (error: any) {
      Log.error("Browse investors error", { error });
      return {
        success: false,
        message: error.message || "Failed to fetch investors",
      };
    }
  }

  /**
   * Browse startups — public listing for investors with filters.
   */
  static async browseStartups(params: {
    search?: string;
    industry?: string;
    sortBy?: 'newest' | 'name' | 'funding_high' | 'funding_low';
    limit?: number;
    cursor?: string;
  }): Promise<ServiceResponse> {
    try {
      const limit = Math.min(50, Math.max(1, params.limit || 16));
      const cursorDate = params.cursor ? new Date(params.cursor) : null;

      const where: any = {
        user: { role: 'founder', status: 1 },
        company_name: { not: null },
      };

      if (params.search?.trim()) {
        const term = params.search.trim();
        where.OR = [
          { company_name: { contains: term, mode: 'insensitive' } },
          { company_description: { contains: term, mode: 'insensitive' } },
          { user: { first_name: { contains: term, mode: 'insensitive' } } },
          { user: { last_name: { contains: term, mode: 'insensitive' } } },
        ];
      }

      if (params.industry?.trim()) {
        where.industry = { name: { equals: params.industry.trim(), mode: 'insensitive' } };
      }

      let orderBy: any = { created_at: 'desc' };
      if (params.sortBy === 'name') orderBy = { company_name: 'asc' };
      else if (params.sortBy === 'funding_high') orderBy = { total_funding: 'desc' };
      else if (params.sortBy === 'funding_low') orderBy = { total_funding: 'asc' };

      if (cursorDate) {
        where.created_at = { ...(where.created_at || {}), lt: cursorDate };
      }

      const startups = await (prisma as any).companyProfile.findMany({
        where,
        take: limit + 1,
        orderBy,
        select: {
          id: true,
          unique_id: true,
          profileImage: true,
          company_name: true,
          company_description: true,
          company_stage: true,
          total_funding: true,
          created_at: true,
          industry: { select: { id: true, name: true } },
          raisingFund: {
            select: { is_raising: true, round_type: true, target_amount: true },
          },
          user: {
            select: {
              id: true,
              unique_id: true,
              first_name: true,
              last_name: true,
              personalInfo: {
                select: { profileImage: true },
              },
            },
          },
        },
      });

      const hasMore = startups.length > limit;
      const slice = hasMore ? startups.slice(0, limit) : startups;

      const data = await Promise.all(
        slice.map(async (s: any) => {
          const companyLogo = s.profileImage
            ? await resolveAttachmentUrl(s.profileImage, 'company_profile_image')
            : null;
          const founderImage = s.user?.personalInfo?.profileImage
            ? await resolveAttachmentUrl(s.user.personalInfo.profileImage, 'profile_image')
            : null;

          return {
            id: s.id,
            uniqueId: s.unique_id,
            companyName: s.company_name,
            companyDescription: s.company_description
              ? String(s.company_description).replace(/<[^>]*>/g, '').slice(0, 160)
              : null,
            companyLogo,
            companyStage: s.company_stage || null,
            industry: s.industry?.name || null,
            totalFunding: s.total_funding != null ? Number(s.total_funding) : null,
            isRaising: s.raisingFund?.is_raising || false,
            roundType: s.raisingFund?.round_type || null,
            targetAmount: s.raisingFund?.target_amount != null ? Number(s.raisingFund.target_amount) : null,
            founder: {
              id: s.user?.id,
              uniqueId: s.user?.unique_id,
              firstName: s.user?.first_name || null,
              lastName: s.user?.last_name || null,
              profileImage: founderImage,
            },
          };
        })
      );

      const nextCursor = hasMore && data.length > 0
        ? slice[slice.length - 1].created_at.toISOString()
        : null;

      return {
        success: true,
        message: "Startups fetched successfully",
        data: { startups: data, nextCursor, hasMore },
      };
    } catch (error: any) {
      Log.error("Browse startups error", { error });
      return {
        success: false,
        message: error.message || "Failed to fetch startups",
      };
    }
  }
}
