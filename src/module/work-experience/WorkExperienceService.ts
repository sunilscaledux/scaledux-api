import { prisma } from "@services/prismaService";
import { CreateWorkExperienceInput, UpdateWorkExperienceInput } from "./WorkExperienceType";
import { ServiceResponse } from "@utils/ApiResponse";
import { updateCompletionSection } from "../profile/ProfileCompletionService";
import { Log } from '@services/loggerService';

/**
 * Recalculate total experience years from work experiences and store on user.
 */
async function recalcExperienceYears(userId: number) {
  const experiences = await prisma.workExperience.findMany({
    where: { user_id: userId },
    select: { start_year: true, end_year: true, is_current: true },
  });
  let total = 0;
  const currentYear = new Date().getFullYear();
  for (const we of experiences) {
    const start = we.start_year ? parseInt(we.start_year) : null;
    const end = we.is_current ? currentYear : (we.end_year ? parseInt(we.end_year) : null);
    if (start && end && end >= start) {
      total += end - start;
    }
  }
  await prisma.user.update({
    where: { id: userId },
    data: { experience_years: Math.max(0, total) },
  });
}

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
      Log.error("Error", { error });
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
      await recalcExperienceYears(userId);
      return {
        success: true,
        message: 'Work experience created successfully',
        data: workExperience
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

      await recalcExperienceYears(userId);

      return {
        success: true,
        message: 'Work experience updated successfully',
        data: updatedWorkExperience
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
      await recalcExperienceYears(userId);
      return {
        success: true,
        message: 'Work experience deleted successfully',
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
