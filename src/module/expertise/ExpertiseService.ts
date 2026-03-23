import { prisma } from "@services/prismaService";
import { CreateUserExpertiseInput, UpdateUserExpertiseInput } from "./ExpertiseType";
import { ServiceResponse } from "@utils/ApiResponse";
import { updateCompletionSection } from "../profile/ProfileCompletionService";
import { Log } from '@services/loggerService';

/** Enrich expertise records with subcategory details resolved from specialty_ids JSON */
async function enrichWithSpecialties(expertises: any[]) {
  const allIds = new Set<number>();
  for (const e of expertises) {
    const ids = Array.isArray(e.specialty_ids) ? e.specialty_ids : [];
    ids.forEach((id: number) => allIds.add(id));
  }

  if (allIds.size === 0) return expertises;

  const subcategories = await prisma.subcategory.findMany({
    where: { id: { in: [...allIds] } },
    select: { id: true, name: true, description: true }
  });
  const subMap = new Map(subcategories.map((s) => [s.id, s]));

  return expertises.map((e) => {
    const ids = Array.isArray(e.specialty_ids) ? e.specialty_ids : [];
    return {
      ...e,
      specialties: ids
        .map((id: number) => subMap.get(id))
        .filter(Boolean)
    };
  });
}

export class ExpertiseService {
  static async createUserExpertise(userId: number, data: CreateUserExpertiseInput): Promise<ServiceResponse> {
    try {
      const category = await prisma.category.findFirst({
        where: { id: data.expertise_category_id, is_active: true }
      });
      if (!category) {
        return { success: false, message: "Invalid expertise category" };
      }

      // Validate all specialty IDs
      const subcategories = await prisma.subcategory.findMany({
        where: { id: { in: data.specialty_ids }, is_active: true }
      });
      if (subcategories.length !== data.specialty_ids.length) {
        return { success: false, message: "One or more invalid specialties" };
      }

      const userExpertise = await prisma.userExpertise.create({
        data: {
          user_id: userId,
          categoryId: data.expertise_category_id,
          specialty_ids: data.specialty_ids,
          description: data.description,
          skills: data.skills || []
        },
        include: {
          category: { select: { id: true, name: true, description: true } }
        }
      });

      const [enriched] = await enrichWithSpecialties([userExpertise]);
      await updateCompletionSection(userId, 'skillsExpertise', true);
      return {
        success: true,
        message: "Expertise added successfully",
        data: enriched
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
          category: { select: { id: true, name: true, description: true } }
        },
        orderBy: { created_at: 'desc' }
      });

      const enriched = await enrichWithSpecialties(userExpertises);

      return {
        success: true,
        message: "User expertises retrieved successfully",
        data: enriched
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

      // Validate all specialty IDs
      const subcategories = await prisma.subcategory.findMany({
        where: { id: { in: data.specialty_ids }, is_active: true }
      });
      if (subcategories.length !== data.specialty_ids.length) {
        return { success: false, message: "One or more invalid specialties" };
      }

      const userExpertise = await prisma.userExpertise.update({
        where: { id: expertiseId },
        data: {
          categoryId: data.expertise_category_id,
          specialty_ids: data.specialty_ids,
          description: data.description,
          skills: data.skills || []
        },
        include: {
          category: { select: { id: true, name: true, description: true } }
        }
      });

      const [enriched] = await enrichWithSpecialties([userExpertise]);

      return {
        success: true,
        message: "User expertise updated successfully",
        data: enriched
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
