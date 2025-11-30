import { Request, Response } from "express";
import { CreateUserExpertiseInput, UpdateUserExpertiseInput } from "./ExpertiseType";
import { prisma } from "@config/prisma";
import { createUserExpertiseSchema, updateUserExpertiseSchema } from "./ExpertiseValidation";
import { ApiResponse } from "@utils/ApiResponse";

export async function createUserExpertise(req: Request, res: Response) {
  const rawBody = req.body || {};

  const { value, error } = createUserExpertiseSchema.validate(rawBody, {
    abortEarly: false,
  });
  if (error) {
    return ApiResponse.joiValidationError(res, error);
  }

  const userId = req.user.id;

  try {
    // Check if expertise category exists
    const expertiseCategory = await prisma.expertiseCategory.findFirst({
      where: { id: value.expertise_category_id, is_active: true }
    });
    if (!expertiseCategory) {
      return ApiResponse.error(res, "Invalid expertise category", 400);
    }

    // Check if specialty exists
    const specialty = await prisma.specialty.findFirst({
      where: { id: value.specialty_id, is_active: true }
    });
    if (!specialty) {
      return ApiResponse.error(res, "Invalid specialty", 400);
    }

    const userExpertise = await prisma.userExpertise.create({
      data: {
        user_id: userId,
        expertise_category_id: value.expertise_category_id,
        specialty_id: value.specialty_id,
        description: value.description,
        skills: value.skills || []
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

    return ApiResponse.success(res, userExpertise, "Expertise added successfully");
  } catch (error: any) {
    console.error("Create User Expertise Error:", error);
    return ApiResponse.error(res, "Failed to add expertise");
  }
}

export async function getUserExpertises(req: Request, res: Response) {
  const userId = req.user.id;

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

    return ApiResponse.success(res, userExpertises, "User expertises retrieved successfully");
  } catch (error: any) {
    console.error("Get User Expertises Error:", error);
    return ApiResponse.error(res, "Failed to retrieve user expertises");
  }
}

export async function updateUserExpertise(req: Request, res: Response) {
  const rawBody = req.body || {};
  const userId = req.user.id;
  const expertiseId = parseInt(req.params.id);

  // Add ID to validation data
  const validationData = { ...rawBody, id: expertiseId };

  const { value, error } = updateUserExpertiseSchema.validate(validationData, {
    abortEarly: false,
  });
  if (error) {
    return ApiResponse.joiValidationError(res, error);
  }

  try {
    // Check if user expertise belongs to user
    const existingUserExpertise = await prisma.userExpertise.findFirst({
      where: {
        id: expertiseId,
        user_id: userId
      }
    });

    if (!existingUserExpertise) {
      return ApiResponse.error(res, "User expertise not found", 404);
    }

    // Check if expertise category exists
    const expertiseCategory = await prisma.expertiseCategory.findFirst({
      where: { id: value.expertise_category_id, is_active: true }
    });
    if (!expertiseCategory) {
      return ApiResponse.error(res, "Invalid expertise category", 400);
    }

    // Check if specialty exists
    const specialty = await prisma.specialty.findFirst({
      where: { id: value.specialty_id, is_active: true }
    });
    if (!specialty) {
      return ApiResponse.error(res, "Invalid specialty", 400);
    }

    const userExpertise = await prisma.userExpertise.update({
      where: {
        id: expertiseId
      },
      data: {
        expertise_category_id: value.expertise_category_id,
        specialty_id: value.specialty_id,
        description: value.description,
        skills: value.skills || []
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

    return ApiResponse.success(res, userExpertise, "User expertise updated successfully");
  } catch (error: any) {
    console.error("Update User Expertise Error:", error);
    return ApiResponse.error(res, "Failed to update user expertise");
  }
}

export async function deleteUserExpertise(req: Request, res: Response) {
  const userId = req.user.id;
  const expertiseId = parseInt(req.params.id);

  if (!expertiseId) {
    return ApiResponse.error(res, "User expertise ID is required", 400);
  }

  try {
    // Check if user expertise belongs to user
    const existingUserExpertise = await prisma.userExpertise.findFirst({
      where: {
        id: expertiseId,
        user_id: userId
      }
    });

    if (!existingUserExpertise) {
      return ApiResponse.error(res, "User expertise not found", 404);
    }

    await prisma.userExpertise.delete({
      where: {
        id: expertiseId
      }
    });

    return ApiResponse.success(res, null, "User expertise deleted successfully");
  } catch (error: any) {
    console.error("Delete User Expertise Error:", error);
    return ApiResponse.error(res, "Failed to delete user expertise");
  }
}

