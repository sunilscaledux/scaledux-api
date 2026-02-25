import { prisma } from "@services/prismaService";
import { CreateUserExpertiseInput, UpdateUserExpertiseInput } from "./ExpertiseType";
import { ServiceResponse } from "@utils/ApiResponse";
import { updateCompletionSection } from "../profile/ProfileCompletionService";

export class ExpertiseService {
  /**
   * Create a new user expertise record
   */
  static async createUserExpertise(userId: number, data: CreateUserExpertiseInput): Promise<ServiceResponse> {
    try {
      // Check if expertise category exists
      const expertiseCategory = await prisma.expertiseCategory.findFirst({
        where: { id: data.expertise_category_id, is_active: true }
      });
      if (!expertiseCategory) {
        return {
          success: false,
          message: "Invalid expertise category"
        };
      }

      // Check if specialty exists
      const specialty = await prisma.specialty.findFirst({
        where: { id: data.specialty_id, is_active: true }
      });
      if (!specialty) {
        return {
          success: false,
          message: "Invalid specialty"
        };
      }

      const userExpertise = await prisma.userExpertise.create({
        data: {
          user_id: userId,
          expertise_category_id: data.expertise_category_id,
          specialty_id: data.specialty_id,
          description: data.description,
          skills: data.skills || []
        },
        include: {
          expertiseCategory: {
            select: { id: true, name: true, description: true }
          },
          specialty: {
            select: { id: true, name: true, description: true }
          }
        }
      });
      await updateCompletionSection(userId, 'skillsExpertise', true);
      return {
        success: true,
        message: "Expertise added successfully",
        data: userExpertise
      };
    } catch (error: any) {
      console.error("Create User Expertise Error:", error);
      return {
        success: false,
        message: "Failed to add expertise"
      };
    }
  }

  /**
   * Get all user expertise records for a user
   */
  static async getUserExpertises(userId: number): Promise<ServiceResponse> {
    try {
      const userExpertises = await prisma.userExpertise.findMany({
        where: {
          user_id: userId
        },
        include: {
          expertiseCategory: {
            select: { id: true, name: true, description: true }
          },
          specialty: {
            select: { id: true, name: true, description: true }
          }
        },
        orderBy: {
          created_at: 'desc'
        }
      });

      return {
        success: true,
        message: "User expertises retrieved successfully",
        data: userExpertises
      };
    } catch (error: any) {
      console.error("Get User Expertises Error:", error);
      return {
        success: false,
        message: "Failed to retrieve user expertises"
      };
    }
  }

  /**
   * Update a user expertise record
   */
  static async updateUserExpertise(userId: number, expertiseId: number, data: UpdateUserExpertiseInput): Promise<ServiceResponse> {
    try {
      // Check if user expertise belongs to user
      const existingUserExpertise = await prisma.userExpertise.findFirst({
        where: {
          id: expertiseId,
          user_id: userId
        }
      });

      if (!existingUserExpertise) {
        return {
          success: false,
          message: "User expertise not found"
        };
      }

      // Check if expertise category exists
      const expertiseCategory = await prisma.expertiseCategory.findFirst({
        where: { id: data.expertise_category_id, is_active: true }
      });
      if (!expertiseCategory) {
        return {
          success: false,
          message: "Invalid expertise category"
        };
      }

      // Check if specialty exists
      const specialty = await prisma.specialty.findFirst({
        where: { id: data.specialty_id, is_active: true }
      });
      if (!specialty) {
        return {
          success: false,
          message: "Invalid specialty"
        };
      }

      const userExpertise = await prisma.userExpertise.update({
        where: {
          id: expertiseId
        },
        data: {
          expertise_category_id: data.expertise_category_id,
          specialty_id: data.specialty_id,
          description: data.description,
          skills: data.skills || []
        },
        include: {
          expertiseCategory: {
            select: { id: true, name: true, description: true }
          },
          specialty: {
            select: { id: true, name: true, description: true }
          }
        }
      });

      return {
        success: true,
        message: "User expertise updated successfully",
        data: userExpertise
      };
    } catch (error: any) {
      console.error("Update User Expertise Error:", error);
      return {
        success: false,
        message: "Failed to update user expertise"
      };
    }
  }

  /**
   * Delete a user expertise record
   */
  static async deleteUserExpertise(userId: number, expertiseId: number): Promise<ServiceResponse> {
    try {
      // Check if user expertise belongs to user
      const existingUserExpertise = await prisma.userExpertise.findFirst({
        where: {
          id: expertiseId,
          user_id: userId
        }
      });

      if (!existingUserExpertise) {
        return {
          success: false,
          message: "User expertise not found"
        };
      }

      await prisma.userExpertise.delete({
        where: {
          id: expertiseId
        }
      });
      const remaining = await prisma.userExpertise.count({ where: { user_id: userId } });
      await updateCompletionSection(userId, 'skillsExpertise', remaining > 0);
      return {
        success: true,
        message: "User expertise deleted successfully",
        data: null
      };
    } catch (error: any) {
      console.error("Delete User Expertise Error:", error);
      return {
        success: false,
        message: "Failed to delete user expertise"
      };
    }
  }
}
