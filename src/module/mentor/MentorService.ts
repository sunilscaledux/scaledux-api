import { prisma } from "@services/prismaService";
import { Log } from "@services/loggerService";
import { ServiceResponse } from "@utils/ApiResponse";
import { resolveAttachmentUrl } from "@services/attachmentService";
import { PROFILE_COMPLETION_THRESHOLD } from "@middleware/requireCompleteProfile";

export class MentorService {

  /**
   * Browse mentors — public listing with filters.
   */
  static async browseMentors(params: {
    search?: string;
    categoryIds?: number[];
    skills?: string[];
    sortBy?: 'newest' | 'rating' | 'experience';
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

      // bar — makes "Receive requests → NO" for incomplete mentors work
      // automatically.
      const where: any = {
        role: 'mentor',
        status: 1,
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

     

      // Hourly rate filter
      if (params.minHourlyRate !== undefined || params.maxHourlyRate !== undefined) {
        const hrFilter: any = {};
        if (params.minHourlyRate !== undefined) hrFilter.gte = params.minHourlyRate||0;
        if (params.maxHourlyRate !== undefined) hrFilter.lte = params.maxHourlyRate;
        where.personalInfo = {
          ...where.personalInfo,
          is: { ...(where.personalInfo?.is || {}), hourly_rate: hrFilter },
        };
      }

      // Rating filter – now a DB-level filter instead of post-filter
      if (params.minRating !== undefined) {
        where.avg_rating = { gte: params.minRating };
      }

      let orderBy: any = { created_at: 'desc' };
      if (params.sortBy === 'experience') {
        orderBy = { experience_years: 'desc' };
      } else if (params.sortBy === 'rating') {
        orderBy = { avg_rating: 'desc' };
      }

      if (cursorDate) {
        where.created_at = { ...(where.created_at || {}), lt: cursorDate };
      }

      const mentors = await (prisma as any).user.findMany({
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
              servicePackages: { where: { status: 'PUBLISHED' } },
            },
          },
        },
      });

      const hasMore = mentors.length > limit;
      const slice = hasMore ? mentors.slice(0, limit) : mentors;

      const data = await Promise.all(
        slice.map(async (mentor: any) => {
          const profileImage = mentor.personalInfo?.profileImage
            ? await resolveAttachmentUrl(mentor.personalInfo.profileImage, 'profile_image')
            : null;

          return {
            id: mentor.id,
            uniqueId: mentor.unique_id,
            firstName: mentor.first_name,
            lastName: mentor.last_name,
            profileImage,
            tagline: mentor.personalInfo?.title || null,
            summary: mentor.personalInfo?.about ? String(mentor.personalInfo.about).replace(/<[^>]*>/g, '').slice(0, 150) : null,
            city: mentor.personalInfo?.city || null,
            country: mentor.personalInfo?.country?.name || null,
            hourlyRate: mentor.personalInfo?.hourly_rate ?? null,
            skills: mentor.expertises.map((e: any) => e.category?.name).filter(Boolean),
            experience: mentor.experience_years || 0,
            avgRating: Number(mentor.avg_rating) || 0,
            reviewCount: mentor._count.reviewsReceived,
            packageCount: mentor._count.servicePackages,
          };
        })
      );

      const nextCursor = hasMore && data.length > 0
        ? slice[slice.length - 1].created_at.toISOString()
        : null;

      return {
        success: true,
        message: "Mentors fetched successfully",
        data: {
          mentors: data,
          nextCursor,
          hasMore,
        },
      };
    } catch (error: any) {
      Log.error("Browse mentors error", { error });
      return {
        success: false,
        message: error.message || "Failed to fetch mentors",
      };
    }
  }

  /**
   * Get featured/recent mentors for homepage.
   */
  static async getFeaturedMentors(limit: number = 6): Promise<ServiceResponse> {
    return MentorService.browseMentors({ limit, sortBy: 'newest' });
  }

  /**
   * Toggle save/unsave a mentor.
   */
  static async toggleSaveMentor(userId: number, mentorUniqueId: string): Promise<ServiceResponse> {
    try {
      const mentor = await prisma.user.findUnique({
        where: { unique_id: mentorUniqueId },
        select: { id: true, role: true }
      });
      if (!mentor) {
        return { success: false, message: "Mentor not found" };
      }
      if (mentor.id === userId) {
        return { success: false, message: "You cannot save your own profile" };
      }

      const existing = await (prisma as any).savedMentor.findFirst({
        where: { mentor_id: mentor.id, user_id: userId }
      });

      if (existing) {
        await (prisma as any).savedMentor.delete({ where: { id: existing.id } });
        return { success: true, message: "Mentor unsaved", data: { is_saved: false } };
      }

      await (prisma as any).savedMentor.create({
        data: { mentor_id: mentor.id, user_id: userId }
      });
      return { success: true, message: "Mentor saved", data: { is_saved: true } };
    } catch (error: any) {
      Log.error("Toggle save mentor error", { error });
      return { success: false, message: "Failed to save mentor" };
    }
  }

  /**
   * Get saved mentors for a user.
   */
  static async getSavedMentors(userId: number): Promise<ServiceResponse> {
    try {
      const saved = await (prisma as any).savedMentor.findMany({
        where: { user_id: userId },
        include: {
          mentor: {
            select: {
              id: true,
              unique_id: true,
              first_name: true,
              last_name: true,
              role: true,
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
                select: { category: { select: { id: true, name: true } } },
                take: 5,
              },
              avg_rating: true,
              _count: {
                select: { reviewsReceived: true },
              },
            },
          },
        },
        orderBy: { created_at: 'desc' },
      });

      const mentors = await Promise.all(
        saved.map(async (s: any) => {
          const m = s.mentor;
          const profileImage = m.personalInfo?.profileImage
            ? await resolveAttachmentUrl(m.personalInfo.profileImage, 'profile_image')
            : null;

          return {
            id: m.id,
            uniqueId: m.unique_id,
            firstName: m.first_name,
            lastName: m.last_name,
            profileImage,
            tagline: m.personalInfo?.title || null,
            summary: m.personalInfo?.about ? String(m.personalInfo.about).replace(/<[^>]*>/g, '').slice(0, 150) : null,
            city: m.personalInfo?.city || null,
            country: m.personalInfo?.country?.name || null,
            hourlyRate: m.personalInfo?.hourly_rate ?? null,
            skills: m.expertises.map((e: any) => e.category?.name).filter(Boolean),
            avgRating: Number(m.avg_rating) || 0,
            reviewCount: m._count.reviewsReceived,
            savedAt: s.created_at,
          };
        })
      );

      return { success: true, message: "Saved mentors fetched", data: mentors };
    } catch (error: any) {
      Log.error("Get saved mentors error", { error });
      return { success: false, message: "Failed to fetch saved mentors" };
    }
  }

  /**
   * Check if a mentor is saved by the user.
   */
  static async checkSaved(userId: number, mentorUniqueId: string): Promise<ServiceResponse> {
    try {
      const mentor = await prisma.user.findUnique({
        where: { unique_id: mentorUniqueId },
        select: { id: true }
      });
      if (!mentor) {
        return { success: true, message: "OK", data: { is_saved: false } };
      }
      const existing = await (prisma as any).savedMentor.findFirst({
        where: { mentor_id: mentor.id, user_id: userId }
      });
      return { success: true, message: "OK", data: { is_saved: !!existing } };
    } catch (error: any) {
      Log.error("Check saved mentor error", { error });
      return { success: true, message: "OK", data: { is_saved: false } };
    }
  }

  /**
   * Save/update mentorship on-request settings.
   */
  static async saveOnRequestSettings(userId: number, data: any): Promise<ServiceResponse> {
    try {
      const durationMap: Record<string, number> = { '15m': 15, '30m': 30, '45m': 45, '1 hr': 60, '1h 15m': 75, '1h 30m': 90, '1h 45m': 105, '2h': 120 };

      const settings = await (prisma as any).mentorOnRequest.upsert({
        where: { user_id: userId },
        update: {
          is_available: !!data.isAvailable,
          session_frequency: Array.isArray(data.sessionFrequency) ? data.sessionFrequency : [],
          session_duration_min: durationMap[data.sessionDurationMin] ?? data.sessionDurationMin ?? null,
          session_duration_max: durationMap[data.sessionDurationMax] ?? data.sessionDurationMax ?? null,
          price_amount: data.priceAmount != null ? Number(data.priceAmount) : null,
          price_currency: data.priceCurrency || 'INR',
          discount_enabled: !!data.discountEnabled,
          discount_title: data.discountTitle?.trim() || null,
          discount_percent: data.discountPercent != null ? Number(data.discountPercent) : null,
          discount_available_till: data.discountAvailableTill ? new Date(data.discountAvailableTill) : null,
          recording_enabled: !!data.recordingEnabled,
          recording_type: data.recordingType || null,
          recording_amount: data.recordingAmount != null ? Number(data.recordingAmount) : null,
          terms_and_conditions: data.termsAndConditions?.trim() || null,
        },
        create: {
          user_id: userId,
          is_available: !!data.isAvailable,
          session_frequency: Array.isArray(data.sessionFrequency) ? data.sessionFrequency : [],
          session_duration_min: durationMap[data.sessionDurationMin] ?? data.sessionDurationMin ?? null,
          session_duration_max: durationMap[data.sessionDurationMax] ?? data.sessionDurationMax ?? null,
          price_amount: data.priceAmount != null ? Number(data.priceAmount) : null,
          price_currency: data.priceCurrency || 'INR',
          discount_enabled: !!data.discountEnabled,
          discount_title: data.discountTitle?.trim() || null,
          discount_percent: data.discountPercent != null ? Number(data.discountPercent) : null,
          discount_available_till: data.discountAvailableTill ? new Date(data.discountAvailableTill) : null,
          recording_enabled: !!data.recordingEnabled,
          recording_type: data.recordingType || null,
          recording_amount: data.recordingAmount != null ? Number(data.recordingAmount) : null,
          terms_and_conditions: data.termsAndConditions?.trim() || null,
        },
      });

      return {
        success: true,
        message: "Mentorship settings saved successfully",
        data: MentorService.mapOnRequestSettings(settings),
      };
    } catch (error: any) {
      Log.error("Save on-request settings error", { error });
      return { success: false, message: "Failed to save mentorship settings" };
    }
  }

  /**
   * Get mentorship on-request settings.
   */
  static async getOnRequestSettings(userId: number): Promise<ServiceResponse> {
    try {
      const settings = await (prisma as any).mentorOnRequest.findUnique({
        where: { user_id: userId },
      });

      return {
        success: true,
        message: "OK",
        data: settings ? MentorService.mapOnRequestSettings(settings) : null,
      };
    } catch (error: any) {
      Log.error("Get on-request settings error", { error });
      return { success: false, message: "Failed to fetch mentorship settings" };
    }
  }

  /**
   * Get public mentorship on-request settings by user unique_id.
   */
  static async getPublicOnRequestSettings(userUniqueId: string): Promise<ServiceResponse> {
    try {
      const user = await prisma.user.findUnique({
        where: { unique_id: userUniqueId },
        select: { id: true },
      });
      if (!user) return { success: false, message: "User not found" };

      const settings = await (prisma as any).mentorOnRequest.findUnique({
        where: { user_id: user.id },
      });

      if (!settings || !settings.is_available) {
        return { success: true, message: "OK", data: null };
      }

      return {
        success: true,
        message: "OK",
        data: MentorService.mapOnRequestSettings(settings),
      };
    } catch (error: any) {
      Log.error("Get public on-request settings error", { error });
      return { success: false, message: "Failed to fetch mentorship settings" };
    }
  }

  private static mapOnRequestSettings(s: any) {
    const minuteToLabel: Record<number, string> = { 15: '15m', 30: '30m', 45: '45m', 60: '1 hr', 75: '1h 15m', 90: '1h 30m', 105: '1h 45m', 120: '2h' };
    return {
      isAvailable: s.is_available,
      sessionFrequency: s.session_frequency ?? [],
      sessionDurationMin: minuteToLabel[s.session_duration_min] ?? s.session_duration_min,
      sessionDurationMax: minuteToLabel[s.session_duration_max] ?? s.session_duration_max,
      priceAmount: s.price_amount != null ? Number(s.price_amount) : null,
      priceCurrency: s.price_currency || 'INR',
      discountEnabled: s.discount_enabled,
      discountTitle: s.discount_title || '',
      discountPercent: s.discount_percent,
      discountAvailableTill: s.discount_available_till,
      recordingEnabled: s.recording_enabled,
      recordingType: s.recording_type || '',
      recordingAmount: s.recording_amount != null ? Number(s.recording_amount) : null,
      termsAndConditions: s.terms_and_conditions || '',
    };
  }
}
