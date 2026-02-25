import { prisma } from "@services/prismaService";
import { CreateAchievementInput, UpdateAchievementInput } from "./AchievementType";
import { ServiceResponse } from "@utils/ApiResponse";
import { getRelativePath, getFileUrl, normalizeUploadedPaths } from "@utils/General";
import { updateCompletionSection } from "../profile/ProfileCompletionService";


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

      // Convert relative paths to full URLs for media files
      const achievementsWithUrls = achievements.map(achievement => ({
        ...achievement,
        media_files: Array.isArray(achievement.media_files)
          ? (achievement.media_files as string[]).map((path: string) => getFileUrl(path))
          : []
      }));

      return {
        success: true,
        message: 'Achievements retrieved successfully',
        data: achievementsWithUrls
      };
    } catch (error) {
      console.error('Error fetching achievements:', error);
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
      // Normalize media file paths (handles both URLs and paths)
      const normalizedMediaFiles = achievementData.media_files 
        ? normalizeUploadedPaths(achievementData.media_files)
        : undefined;

      const achievement = await prisma.achievement.create({
        data: {
          user_id: userId,
          title: achievementData.title,
          description: achievementData.description || undefined,
          company: achievementData.company,
          completed_month: achievementData.completed_month,
          completed_year: achievementData.completed_year,
          achievement_link: achievementData.achievement_link || undefined,
          media_files: normalizedMediaFiles
        }
      });
      await updateCompletionSection(userId, 'achievements', true);
      return {
        success: true,
        message: 'Achievement created successfully',
        data: achievement
      };
    } catch (error) {
      console.error('Error creating achievement:', error);
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

      // Normalize media file paths (handles both URLs and paths)
      const normalizedMediaFiles = achievementData.media_files 
        ? normalizeUploadedPaths(achievementData.media_files)
        : undefined;

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
          media_files: normalizedMediaFiles
        }
      });

      return {
        success: true,
        message: 'Achievement updated successfully',
        data: updatedAchievement
      };
    } catch (error) {
      console.error('Error updating achievement:', error);
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
      console.error('Error deleting achievement:', error);
      return {
        success: false,
        message: 'Internal server error'
      };
    }
  }

}
