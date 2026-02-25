import { prisma } from "@services/prismaService";
import { CreateWorkExperienceInput, UpdateWorkExperienceInput } from "./WorkExperienceType";
import { ServiceResponse } from "@utils/ApiResponse";
import { updateCompletionSection } from "../profile/ProfileCompletionService";

export class WorkExperienceService {
  /**
   * Get all work experiences for a user
   */
  static async getWorkExperiences(userId: number): Promise<ServiceResponse> {
    try {
      const workExperiences = await prisma.workExperience.findMany({
        where: {
          user_id: userId
        },
        orderBy: {
          created_at: 'desc'
        }
      });

      return {
        success: true,
        message: 'Work experiences retrieved successfully',
        data: workExperiences
      };
    } catch (error) {
      console.error('Error fetching work experiences:', error);
      return {
        success: false,
        message: 'Internal server error'
      };
    }
  }

  /**
   * Create a new work experience
   */
  static async createWorkExperience(userId: number, workExperienceData: CreateWorkExperienceInput): Promise<ServiceResponse> {
    try {
      // If is_current is true, clear end_month and end_year
      if (workExperienceData.is_current) {
        workExperienceData.end_month = undefined;
        workExperienceData.end_year = undefined;
      }

      const workExperience = await prisma.workExperience.create({
        data: {
          user_id: userId,
          role: workExperienceData.role,
          company: workExperienceData.company,
          company_website: workExperienceData.company_website || null,
          description: workExperienceData.description || null,
          start_month: workExperienceData.start_month,
          start_year: workExperienceData.start_year,
          end_month: workExperienceData.end_month || null,
          end_year: workExperienceData.end_year || null,
          is_current: workExperienceData.is_current
        }
      });
      await updateCompletionSection(userId, 'workExperience', true);
      return {
        success: true,
        message: 'Work experience created successfully',
        data: workExperience
      };
    } catch (error) {
      console.error('Error creating work experience:', error);
      return {
        success: false,
        message: 'Internal server error'
      };
    }
  }

  /**
   * Update a work experience
   */
  static async updateWorkExperience(userId: number, workExperienceData: UpdateWorkExperienceInput): Promise<ServiceResponse> {
    try {
      // Check if work experience exists and belongs to user
      const existingWorkExperience = await prisma.workExperience.findFirst({
        where: {
          id: workExperienceData.id,
          user_id: userId
        }
      });

      if (!existingWorkExperience) {
        return {
          success: false,
          message: 'Work experience not found'
        };
      }

      // If is_current is true, clear end_month and end_year
      if (workExperienceData.is_current) {
        workExperienceData.end_month = undefined;
        workExperienceData.end_year = undefined;
      }

      const updatedWorkExperience = await prisma.workExperience.update({
        where: {
          id: workExperienceData.id
        },
        data: {
          role: workExperienceData.role,
          company: workExperienceData.company,
          company_website: workExperienceData.company_website || null,
          description: workExperienceData.description || null,
          start_month: workExperienceData.start_month,
          start_year: workExperienceData.start_year,
          end_month: workExperienceData.end_month || null,
          end_year: workExperienceData.end_year || null,
          is_current: workExperienceData.is_current
        }
      });

      return {
        success: true,
        message: 'Work experience updated successfully',
        data: updatedWorkExperience
      };
    } catch (error) {
      console.error('Error updating work experience:', error);
      return {
        success: false,
        message: 'Internal server error'
      };
    }
  }

  /**
   * Delete a work experience
   */
  static async deleteWorkExperience(userId: number, workExperienceId: number): Promise<ServiceResponse> {
    try {
      // Check if work experience exists and belongs to user
      const existingWorkExperience = await prisma.workExperience.findFirst({
        where: {
          id: workExperienceId,
          user_id: userId
        }
      });

      if (!existingWorkExperience) {
        return {
          success: false,
          message: 'Work experience not found'
        };
      }

      await prisma.workExperience.delete({
        where: {
          id: workExperienceId
        }
      });
      const remaining = await prisma.workExperience.count({ where: { user_id: userId } });
      await updateCompletionSection(userId, 'workExperience', remaining > 0);
      return {
        success: true,
        message: 'Work experience deleted successfully',
        data: null
      };
    } catch (error) {
      console.error('Error deleting work experience:', error);
      return {
        success: false,
        message: 'Internal server error'
      };
    }
  }
}
