import { prisma } from "@services/prismaService";
import { CreateEducationInput, UpdateEducationInput } from "./EducationType";
import { ServiceResponse } from "@utils/ApiResponse";
import { updateCompletionSection } from "../profile/ProfileCompletionService";
import { Log } from '@services/loggerService';

export class EducationService {
  /**
   * Create a new education record
   */
  static async createEducation(userId: number, data: CreateEducationInput): Promise<ServiceResponse> {
    try {
      const education = await prisma.education.create({
        data: {
          user_id: userId,
          school: data.school,
          degree: data.degree,
          area_of_study: data.area_of_study,
          start_month: data.start_month,
          start_year: data.start_year,
          end_month: data.is_ongoing ? null : data.end_month,
          end_year: data.is_ongoing ? null : data.end_year,
          is_ongoing: data.is_ongoing,
          description: data.description,
          skills: data.skills || []
        }
      });
      await updateCompletionSection(userId, 'education', true);
      return {
        success: true,
        message: "Education added successfully",
        data: education
      };
    } catch (error: any) {
      Log.error("Error", { error });
      return {
        success: false,
        message: "Failed to add education"
      };
    }
  }

  /**
   * Get all education records for a user
   */
  static async getEducations(userId: number): Promise<ServiceResponse> {
    try {
      const educations = await prisma.education.findMany({
        where: {
          user_id: userId
        },
        orderBy: {
          start_year: 'desc'
        }
      });

      return {
        success: true,
        message: "Educations retrieved successfully",
        data: educations
      };
    } catch (error: any) {
      Log.error("Error", { error });
      return {
        success: false,
        message: "Failed to retrieve educations"
      };
    }
  }

  /**
   * Update an education record
   */
  static async updateEducation(userId: number, educationId: number, data: UpdateEducationInput): Promise<ServiceResponse> {
    try {
      // Check if education belongs to user
      const existingEducation = await prisma.education.findFirst({
        where: {
          id: educationId,
          user_id: userId
        }
      });

      if (!existingEducation) {
        return {
          success: false,
          message: "Education not found"
        };
      }

      const education = await prisma.education.update({
        where: {
          id: educationId
        },
        data: {
          school: data.school,
          degree: data.degree,
          area_of_study: data.area_of_study,
          start_month: data.start_month,
          start_year: data.start_year,
          end_month: data.is_ongoing ? null : data.end_month,
          end_year: data.is_ongoing ? null : data.end_year,
          is_ongoing: data.is_ongoing,
          description: data.description,
          skills: data.skills || []
        }
      });

      return {
        success: true,
        message: "Education updated successfully",
        data: education
      };
    } catch (error: any) {
      Log.error("Error", { error });
      return {
        success: false,
        message: "Failed to update education"
      };
    }
  }

  /**
   * Delete an education record
   */
  static async deleteEducation(userId: number, educationId: number): Promise<ServiceResponse> {
    try {
      // Check if education belongs to user
      const existingEducation = await prisma.education.findFirst({
        where: {
          id: educationId,
          user_id: userId
        }
      });

      if (!existingEducation) {
        return {
          success: false,
          message: "Education not found"
        };
      }

      await prisma.education.delete({
        where: {
          id: educationId
        }
      });
      const remaining = await prisma.education.count({ where: { user_id: userId } });
      await updateCompletionSection(userId, 'education', remaining > 0);
      return {
        success: true,
        message: "Education deleted successfully",
        data: null
      };
    } catch (error: any) {
      Log.error("Error", { error });
      return {
        success: false,
        message: "Failed to delete education"
      };
    }
  }
}
