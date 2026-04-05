import { prisma } from "@services/prismaService";
import { Log } from "@services/loggerService";
import { ServiceResponse } from "@utils/ApiResponse";
import { resolveAttachmentUrl } from "@services/attachmentService";

export class MentorService {

  /**
   * Browse mentors — public listing with filters.
   */
  static async browseMentors(params: {
    search?: string;
    categoryId?: number;
    skills?: string[];
    sortBy?: 'newest' | 'rating' | 'experience';
    page?: number;
    limit?: number;
  }): Promise<ServiceResponse> {
    try {
      const page = Math.max(1, params.page || 1);
      const limit = Math.min(50, Math.max(1, params.limit || 12));
      const skip = (page - 1) * limit;

      const where: any = {
        role: 'mentor',
        status: 1,
        personalInfo: { isNot: null },
      };

      if (params.search?.trim()) {
        const term = params.search.trim();
        where.OR = [
          { first_name: { contains: term, mode: 'insensitive' } },
          { last_name: { contains: term, mode: 'insensitive' } },
          { personalInfo: { title: { contains: term, mode: 'insensitive' } } },
        ];
      }

      if (params.categoryId) {
        where.expertises = {
          some: { categoryId: params.categoryId }
        };
      } else if (params.skills && params.skills.length > 0) {
        where.expertises = {
          some: {
            category: {
              name: { in: params.skills, mode: 'insensitive' }
            }
          }
        };
      }

      let orderBy: any = { created_at: 'desc' };
      if (params.sortBy === 'experience') {
        orderBy = { created_at: 'asc' };
      }

      const [mentors, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: limit,
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
            reviewsReceived: {
              select: { rating: true },
            },
            _count: {
              select: {
                reviewsReceived: true,
                servicePackages: { where: { status: 'PUBLISHED' } },
              },
            },
          },
        }),
        prisma.user.count({ where }),
      ]);

      const data = await Promise.all(
        mentors.map(async (mentor) => {
          const ratings = mentor.reviewsReceived.map((r: any) => Number(r.rating) || 0);
          const avgRating = ratings.length > 0 ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : 0;
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
            avgRating,
            reviewCount: mentor._count.reviewsReceived,
            packageCount: mentor._count.servicePackages,
          };
        })
      );

      return {
        success: true,
        message: "Mentors fetched successfully",
        data: {
          mentors: data,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      };
    } catch (error: any) {
      Log.error("Browse mentors error", { error });
      return {
        success: false,
        message: "Failed to fetch mentors",
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
              reviewsReceived: {
                select: { rating: true },
              },
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
          const ratings = m.reviewsReceived.map((r: any) => Number(r.rating) || 0);
          const avgRating = ratings.length > 0 ? Math.round((ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length) * 10) / 10 : 0;
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
            avgRating,
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
}
