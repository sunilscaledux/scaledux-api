import { prisma } from "@services/prismaService";
import { CreateUserExpertiseInput, UpdateUserExpertiseInput } from "./ExpertiseType";
import { ServiceResponse } from "@utils/ApiResponse";
import { updateCompletionSection } from "../profile/ProfileCompletionService";
import { Log } from '@services/loggerService';

export class ExpertiseService {
  static async createUserExpertise(userId: number, data: CreateUserExpertiseInput): Promise<ServiceResponse> {
    try {
      const category = await prisma.category.findFirst({
        where: { id: data.expertise_category_id, is_active: true }
      });
      if (!category) {
        return { success: false, message: "Invalid expertise category" };
      }

      const subcategory = await prisma.subcategory.findFirst({
        where: { id: data.specialty_id, is_active: true }
      });
      if (!subcategory) {
        return { success: false, message: "Invalid subcategory" };
      }

      const userExpertise = await prisma.userExpertise.create({
        data: {
          user_id: userId,
          categoryId: data.expertise_category_id,
          subcategoryId: data.specialty_id,
          description: data.description,
          skills: data.skills || []
        },
        include: {
          category: { select: { id: true, name: true, description: true } },
          subcategory: { select: { id: true, name: true, description: true } }
        }
      });
      await updateCompletionSection(userId, 'skillsExpertise', true);
      return {
        success: true,
        message: "Expertise added successfully",
        data: userExpertise
      };
    } catch (error: any) {
      Log.error("Error", { error });
      return { success: false, message: "Failed to add expertise" };
    }
  }

  static async getUserExpertises(userId: number): Promise<ServiceResponse> {
    try {
      const userExpertises = await prisma.userExpertise.findMany({
        where: { user_id: userId },
        include: {
          category: { select: { id: true, name: true, description: true } },
          subcategory: { select: { id: true, name: true, description: true } }
        },
        orderBy: { created_at: 'desc' }
      });

      return {
        success: true,
        message: "User expertises retrieved successfully",
        data: userExpertises
      };
    } catch (error: any) {
      Log.error("Error", { error });
      return { success: false, message: "Failed to retrieve user expertises" };
    }
  }

  static async updateUserExpertise(userId: number, expertiseId: number, data: UpdateUserExpertiseInput): Promise<ServiceResponse> {
    try {
      const existingUserExpertise = await prisma.userExpertise.findFirst({
        where: { id: expertiseId, user_id: userId }
      });

      if (!existingUserExpertise) {
        return { success: false, message: "User expertise not found" };
      }

      const category = await prisma.category.findFirst({
        where: { id: data.expertise_category_id, is_active: true }
      });
      if (!category) {
        return { success: false, message: "Invalid expertise category" };
      }

      const subcategory = await prisma.subcategory.findFirst({
        where: { id: data.specialty_id, is_active: true }
      });
      if (!subcategory) {
        return { success: false, message: "Invalid subcategory" };
      }

      const userExpertise = await prisma.userExpertise.update({
        where: { id: expertiseId },
        data: {
          categoryId: data.expertise_category_id,
          subcategoryId: data.specialty_id,
          description: data.description,
          skills: data.skills || []
        },
        include: {
          category: { select: { id: true, name: true, description: true } },
          subcategory: { select: { id: true, name: true, description: true } }
        }
      });

      return {
        success: true,
        message: "User expertise updated successfully",
        data: userExpertise
      };
    } catch (error: any) {
      Log.error("Error", { error });
      return { success: false, message: "Failed to update user expertise" };
    }
  }

  static async deleteUserExpertise(userId: number, expertiseId: number): Promise<ServiceResponse> {
    try {
      const existingUserExpertise = await prisma.userExpertise.findFirst({
        where: { id: expertiseId, user_id: userId }
      });

      if (!existingUserExpertise) {
        return { success: false, message: "User expertise not found" };
      }

      await prisma.userExpertise.delete({ where: { id: expertiseId } });
      const remaining = await prisma.userExpertise.count({ where: { user_id: userId } });
      await updateCompletionSection(userId, 'skillsExpertise', remaining > 0);
      return {
        success: true,
        message: "User expertise deleted successfully",
        data: null
      };
    } catch (error: any) {
      Log.error("Error", { error });
      return { success: false, message: "Failed to delete user expertise" };
    }
  }
}
