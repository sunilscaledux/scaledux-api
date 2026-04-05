import { prisma } from "@services/prismaService";
import { CreateAchievementInput, UpdateAchievementInput } from "./AchievementType";
import { ServiceResponse } from "@utils/ApiResponse";
import { resolveAttachmentUrls, urlsOrPathsToAttachmentIds, markAttachmentsAttached } from "@services/attachmentService";
import { updateCompletionSection } from "../profile/ProfileCompletionService";
import { Log } from '@services/loggerService';


export class AchievementService {
  /**
   * Get all achievements for a user
   */
  static async getAchievements(userId: number): Promise<ServiceResponse> {
    try {
      const achievements = await prisma.achievement.findMany({
        where: {
          user_id: userId
        },
        orderBy: [
          { completed_year: 'desc' },
          { completed_month: 'desc' },
          { created_at: 'desc' }
        ]
      });

      // Convert relative paths or attachment ids to full URLs for media files
      const achievementsWithUrls = await Promise.all(achievements.map(async achievement => ({
        ...achievement,
        media_files: Array.isArray(achievement.media_files)
          ? await resolveAttachmentUrls(achievement.media_files as string[], 'achievement_media')
          : []
      })));

      return {
        success: true,
        message: 'Achievements retrieved successfully',
        data: achievementsWithUrls
      };
    } catch (error) {
      Log.error("Error", { error });
      return {
        success: false,
        message: 'Internal server error'
      };
    }
  }

  /**
   * Create a new achievement
   */
  static async createAchievement(userId: number, achievementData: CreateAchievementInput): Promise<ServiceResponse> {
    try {
      const achievement = await prisma.achievement.create({
        data: {
          user_id: userId,
          title: achievementData.title,
          description: achievementData.description || undefined,
          company: achievementData.company,
          completed_month: achievementData.completed_month,
          completed_year: achievementData.completed_year,
          achievement_link: achievementData.achievement_link || undefined,
          media_files: Array.isArray(achievementData.media_files) ? urlsOrPathsToAttachmentIds(achievementData.media_files) : undefined
        }
      });
      const mediaIds = Array.isArray(achievement.media_files) ? (achievement.media_files as string[]) : [];
      if (mediaIds.length > 0) await markAttachmentsAttached(mediaIds, [userId]);
      await updateCompletionSection(userId, 'achievements', true);
      return {
        success: true,
        message: 'Achievement created successfully',
        data: {
          ...achievement,
          media_files: Array.isArray(achievement.media_files)
            ? await resolveAttachmentUrls(achievement.media_files as string[], 'achievement_media')
            : []
        }
      };
    } catch (error) {
      Log.error("Error", { error });
      return {
        success: false,
        message: 'Internal server error'
      };
    }
  }

  /**
   * Update an achievement
   */
  static async updateAchievement(userId: number, achievementData: UpdateAchievementInput): Promise<ServiceResponse> {
    try {
      // Check if achievement exists and belongs to the user
      const existingAchievement = await prisma.achievement.findFirst({
        where: {
          id: achievementData.id,
          user_id: userId
        }
      });

      if (!existingAchievement) {
        return {
          success: false,
          message: 'Achievement not found'
        };
      }

      const updatedAchievement = await prisma.achievement.update({
        where: {
          id: achievementData.id
        },
        data: {
          title: achievementData.title,
          description: achievementData.description || undefined,
          company: achievementData.company,
          completed_month: achievementData.completed_month,
          completed_year: achievementData.completed_year,
          achievement_link: achievementData.achievement_link || undefined,
          media_files: Array.isArray(achievementData.media_files) ? urlsOrPathsToAttachmentIds(achievementData.media_files) : undefined
        }
      });

      const updatedMediaIds = Array.isArray(updatedAchievement.media_files) ? (updatedAchievement.media_files as string[]) : [];
      if (updatedMediaIds.length > 0) await markAttachmentsAttached(updatedMediaIds, [userId]);
      return {
        success: true,
        message: 'Achievement updated successfully',
        data: {
          ...updatedAchievement,
          media_files: Array.isArray(updatedAchievement.media_files)
            ? await resolveAttachmentUrls(updatedAchievement.media_files as string[], 'achievement_media')
            : []
        }
      };
    } catch (error) {
      Log.error("Error", { error });
      return {
        success: false,
        message: 'Internal server error'
      };
    }
  }

  /**
   * Delete an achievement
   */
  static async deleteAchievement(userId: number, achievementId: number): Promise<ServiceResponse> {
    try {
      // Check if achievement exists and belongs to the user
      const existingAchievement = await prisma.achievement.findFirst({
        where: {
          id: achievementId,
          user_id: userId
        }
      });

      if (!existingAchievement) {
        return {
          success: false,
          message: 'Achievement not found'
        };
      }

      await prisma.achievement.delete({
        where: {
          id: achievementId
        }
      });
      const remaining = await prisma.achievement.count({ where: { user_id: userId } });
      await updateCompletionSection(userId, 'achievements', remaining > 0);
      return {
        success: true,
        message: 'Achievement deleted successfully',
        data: null
      };
    } catch (error) {
      Log.error("Error", { error });
      return {
        success: false,
        message: 'Internal server error'
      };
    }
  }

}
