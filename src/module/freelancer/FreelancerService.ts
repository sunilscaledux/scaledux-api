import { prisma } from "@services/prismaService";
import { Log } from "@services/loggerService";
import { ServiceResponse } from "@utils/ApiResponse";
import { resolveAttachmentUrl } from "@services/attachmentService";
import { PROFILE_COMPLETION_THRESHOLD } from "@middleware/requireCompleteProfile";

export class FreelancerService {

  /**
   * Browse freelancers — public listing with filters.
   */
  static async browseFreelancers(params: {
    search?: string;
    categoryIds?: number[];
    skills?: string[];
    sortBy?: 'newest' | 'rating' | 'experience' | 'hourly_rate';
    minExperience?: number;
    maxExperience?: number;
    minRating?: number;
    minHourlyRate?: number;
    maxHourlyRate?: number;
    limit?: number;
    cursor?: string;
  }): Promise<ServiceResponse> {
    try {
      const limit = Math.min(50, Math.max(1, params.limit || 16));
      const cursorDate = params.cursor ? new Date(params.cursor) : null;

      const where: any = {
        role: 'freelancer',
        status: 1,
        profile_completion_percentage: { gte: PROFILE_COMPLETION_THRESHOLD },
      };

      if (params.search?.trim()) {
        const term = params.search.trim();
        where.OR = [
          { first_name: { contains: term, mode: 'insensitive' } },
          { last_name: { contains: term, mode: 'insensitive' } },
          { personalInfo: { is: { title: { contains: term, mode: 'insensitive' } } } },
        ];
      }

      if (params.categoryIds && params.categoryIds.length > 0) {
        where.AND = [
          ...(where.AND || []),
          {
            OR: [
              {
                expertises: {
                  some: params.categoryIds.length === 1
                    ? { categoryId: params.categoryIds[0] }
                    : { categoryId: { in: params.categoryIds } }
                }
              },
              { expertises: { none: {} } },
            ]
          }
        ];
      } else if (params.skills && params.skills.length > 0) {
        where.expertises = {
          some: {
            category: {
              name: { in: params.skills, mode: 'insensitive' }
            }
          }
        };
      }

      // Experience filter
      if (params.minExperience !== undefined || params.maxExperience !== undefined) {
        const expFilter: any = {};
        if (params.minExperience !== undefined) expFilter.gte = params.minExperience;
        if (params.maxExperience !== undefined) expFilter.lte = params.maxExperience;
        where.experience_years = expFilter;
      }

      // Hourly rate filter
      if (params.minHourlyRate !== undefined || params.maxHourlyRate !== undefined) {
        const hrFilter: any = {};
        if (params.minHourlyRate !== undefined) hrFilter.gte = params.minHourlyRate || 0;
        if (params.maxHourlyRate !== undefined) hrFilter.lte = params.maxHourlyRate;
        where.personalInfo = {
          ...where.personalInfo,
          is: { ...(where.personalInfo?.is || {}), hourly_rate: hrFilter },
        };
      }

      // Rating filter
      if (params.minRating !== undefined) {
        where.avg_rating = { gte: params.minRating };
      }

      let orderBy: any = { created_at: 'desc' };
      if (params.sortBy === 'experience') {
        orderBy = { experience_years: 'desc' };
      } else if (params.sortBy === 'rating') {
        orderBy = { avg_rating: 'desc' };
      } else if (params.sortBy === 'hourly_rate') {
        orderBy = { personalInfo: { hourly_rate: 'desc' } };
      }

      if (cursorDate) {
        where.created_at = { ...(where.created_at || {}), lt: cursorDate };
      }

      const freelancers = await (prisma as any).user.findMany({
        where,
        take: limit + 1,
        orderBy,
        select: {
          id: true,
          unique_id: true,
          first_name: true,
          last_name: true,
          role: true,
          experience_years: true,
          created_at: true,
          personalInfo: {
            select: {
              profileImage: true,
              title: true,
              about: true,
              city: true,
              hourly_rate: true,
              country: { select: { name: true } },
            },
          },
          expertises: {
            select: {
              category: { select: { id: true, name: true } },
            },
            take: 5,
          },
          avg_rating: true,
          _count: {
            select: {
              reviewsReceived: true,
            },
          },
        },
      });

      const hasMore = freelancers.length > limit;
      const slice = hasMore ? freelancers.slice(0, limit) : freelancers;

      const data = await Promise.all(
        slice.map(async (user: any) => {
          const profileImage = user.personalInfo?.profileImage
            ? await resolveAttachmentUrl(user.personalInfo.profileImage, 'profile_image')
            : null;

          return {
            id: user.id,
            uniqueId: user.unique_id,
            firstName: user.first_name,
            lastName: user.last_name,
            profileImage,
            tagline: user.personalInfo?.title || null,
            summary: user.personalInfo?.about ? String(user.personalInfo.about).replace(/<[^>]*>/g, '').slice(0, 150) : null,
            city: user.personalInfo?.city || null,
            country: user.personalInfo?.country?.name || null,
            hourlyRate: user.personalInfo?.hourly_rate ?? null,
            skills: user.expertises.map((e: any) => e.category?.name).filter(Boolean),
            experience: user.experience_years || 0,
            avgRating: Number(user.avg_rating) || 0,
            reviewCount: user._count.reviewsReceived,
          };
        })
      );

      const nextCursor = hasMore && data.length > 0
        ? slice[slice.length - 1].created_at.toISOString()
        : null;

      return {
        success: true,
        message: "Service providers fetched successfully",
        data: {
          providers: data,
          nextCursor,
          hasMore,
        },
      };
    } catch (error: any) {
      Log.error("Browse freelancers error", { error });
      return {
        success: false,
        message: "Failed to fetch service providers",
      };
    }
  }
}
