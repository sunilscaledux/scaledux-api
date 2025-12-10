import { prisma } from "@services/prismaService";
import { CreateAchievementInput, UpdateAchievementInput, MediaFile } from "./AchievementType";
import { ServiceResponse } from "@utils/ApiResponse";

// Helper function to get relative path (same as in ProfileController)
const getRelativePath = (fullPath: string): string => {
  const uploadsIndex = fullPath.indexOf('uploads')
  if (uploadsIndex !== -1) {
    return fullPath.substring(uploadsIndex)
  }
  return fullPath
}

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

      return {
        success: true,
        message: 'Achievements retrieved successfully',
        data: achievements
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
      const achievement = await prisma.achievement.create({
        data: {
          user_id: userId,
          title: achievementData.title,
          description: achievementData.description || undefined,
          company: achievementData.company,
          completed_month: achievementData.completed_month,
          completed_year: achievementData.completed_year,
          achievement_link: achievementData.achievement_link || undefined,
          media_files: achievementData.media_files ? JSON.parse(JSON.stringify(achievementData.media_files)) : undefined
        }
      });

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
          media_files: achievementData.media_files ? JSON.parse(JSON.stringify(achievementData.media_files)) : undefined
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

  /**
   * Upload achievement media files
   */
  static async uploadAchievementMedia(userId: number, files: Express.Multer.File[]): Promise<ServiceResponse> {
    try {
      if (!files || !Array.isArray(files) || files.length === 0) {
        return {
          success: false,
          message: 'No files uploaded'
        };
      }

      // Process uploaded files
      const mediaFiles: MediaFile[] = files.map((file: Express.Multer.File) => {
        const relativePath = getRelativePath(file.path);
        
        return {
          url: `/${relativePath.replace(/\\/g, '/')}`, // Ensure forward slashes for URLs
          name: file.originalname,
          type: file.mimetype.startsWith('image/') ? 'image' : 'document',
          size: file.size,
          mimeType: file.mimetype
        };
      });

      return {
        success: true,
        message: 'Media files uploaded successfully',
        data: {
          mediaFiles,
          count: mediaFiles.length
        }
      };
    } catch (error) {
      console.error('Error uploading achievement media:', error);
      return {
        success: false,
        message: 'Internal server error'
      };
    }
  }
}
