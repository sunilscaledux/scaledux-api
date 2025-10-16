import {Request,Response} from 'express'
import { ProfileSummaryInput } from './ProfileType'
import { prisma } from "@config/prisma";
import { updateSummarySchema } from "./ProfileValidation";
import { ApiResponse } from "@utils/ApiResponse";
import { getFileUrl, getRelativePath } from "@utils/General";

export async function updateProfileSummary(req: Request, res: Response) {
  const rawBody = req.body || {};

  const { value, error } = updateSummarySchema.validate(rawBody, {
    abortEarly: false,
  });
  if (error) {
    return ApiResponse.joiValidationError(res, error);
  }

  const userId = req.user.id;

  const user = await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      FirstName: value.FirstName,
      LastName: value.LastName,
      title: value.title,
      about: value.about,
    },
  });

  return ApiResponse.success(res, user, "Profile updated successfully");
}

export async function uploadProfileImage(req: Request, res: Response) {
  try {
    if (!req.file) {
      return ApiResponse.error(res, "No file uploaded", 400);
    }

    const userId = req.user.id;
    const imageUrl = getRelativePath(req.file.path);

    // Update user's profile image in database
    const user = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        profileImage: imageUrl,
      },
    });

    return ApiResponse.success(
      res,
      { imageUrl },
      "Profile image uploaded successfully"
    );
  } catch (error) {
    console.error("Error uploading profile image:", error);
    return ApiResponse.error(res, "Failed to upload profile image", 500);
  }
}

export async function uploadCoverImage(req: Request, res: Response) {
  try {
    if (!req.file) {
      return ApiResponse.error(res, "No file uploaded", 400);
    }

    const userId = req.user.id;
    const imageUrl = getRelativePath(req.file.path);
    // Update user's cover image in database
    const user = await prisma.user.update({
      where: { id: userId },
      data: { coverImage: imageUrl },
    });

    return ApiResponse.success(
      res,
      { imageUrl },
      "Cover image uploaded successfully"
    );
  } catch (error) {
    console.error("Error uploading cover image:", error);
    return ApiResponse.error(res, "Failed to upload cover image", 500);
  }
}