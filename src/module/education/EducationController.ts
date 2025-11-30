import { Request, Response } from "express";
import { CreateEducationInput, UpdateEducationInput } from "./EducationType";
import { prisma } from "@config/prisma";
import { createEducationSchema, updateEducationSchema } from "./EducationValidation";
import { ApiResponse } from "@utils/ApiResponse";

export async function createEducation(req: Request, res: Response) {
  const rawBody = req.body || {};

  const { value, error } = createEducationSchema.validate(rawBody, {
    abortEarly: false,
  });
  if (error) {
    return ApiResponse.joiValidationError(res, error);
  }

  const userId = req.user.id;

  try {
    const education = await prisma.education.create({
      data: {
        user_id: userId,
        school: value.school,
        degree: value.degree,
        area_of_study: value.area_of_study,
        start_month: value.start_month,
        start_year: value.start_year,
        end_month: value.is_ongoing ? null : value.end_month,
        end_year: value.is_ongoing ? null : value.end_year,
        is_ongoing: value.is_ongoing,
        description: value.description,
        skills: value.skills || []
      }
    });

    return ApiResponse.success(res, education, "Education added successfully");
  } catch (error: any) {
    console.error("Create Education Error:", error);
    return ApiResponse.error(res, "Failed to add education");
  }
}

export async function getEducations(req: Request, res: Response) {
  const userId = req.user.id;

  try {
    const educations = await prisma.education.findMany({
      where: {
        user_id: userId
      },
      orderBy: {
        start_year: 'desc'
      }
    });

    return ApiResponse.success(res, educations, "Educations retrieved successfully");
  } catch (error: any) {
    console.error("Get Educations Error:", error);
    return ApiResponse.error(res, "Failed to retrieve educations");
  }
}

export async function updateEducation(req: Request, res: Response) {
  const rawBody = req.body || {};
  const userId = req.user.id;
  const educationId = parseInt(req.params.id);

  // Add ID to validation data
  const validationData = { ...rawBody, id: educationId };

  const { value, error } = updateEducationSchema.validate(validationData, {
    abortEarly: false,
  });
  if (error) {
    return ApiResponse.joiValidationError(res, error);
  }

  try {
    // Check if education belongs to user
    const existingEducation = await prisma.education.findFirst({
      where: {
        id: educationId,
        user_id: userId
      }
    });

    if (!existingEducation) {
      return ApiResponse.error(res, "Education not found", 404);
    }

    const education = await prisma.education.update({
      where: {
        id: educationId
      },
      data: {
        school: value.school,
        degree: value.degree,
        area_of_study: value.area_of_study,
        start_month: value.start_month,
        start_year: value.start_year,
        end_month: value.is_ongoing ? null : value.end_month,
        end_year: value.is_ongoing ? null : value.end_year,
        is_ongoing: value.is_ongoing,
        description: value.description,
        skills: value.skills || []
      }
    });

    return ApiResponse.success(res, education, "Education updated successfully");
  } catch (error: any) {
    console.error("Update Education Error:", error);
    return ApiResponse.error(res, "Failed to update education");
  }
}

export async function deleteEducation(req: Request, res: Response) {
  const userId = req.user.id;
  const educationId = parseInt(req.params.id);

  if (!educationId) {
    return ApiResponse.error(res, "Education ID is required", 400);
  }

  try {
    // Check if education belongs to user
    const existingEducation = await prisma.education.findFirst({
      where: {
        id: educationId,
        user_id: userId
      }
    });

    if (!existingEducation) {
      return ApiResponse.error(res, "Education not found", 404);
    }

    await prisma.education.delete({
      where: {
        id: educationId
      }
    });

    return ApiResponse.success(res, null, "Education deleted successfully");
  } catch (error: any) {
    console.error("Delete Education Error:", error);
    return ApiResponse.error(res, "Failed to delete education");
  }
}
