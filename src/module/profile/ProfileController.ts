import {Request,Response} from 'express'
import { ProfileSummaryInput, PersonalInfoInput, HourlyRateInput } from './ProfileType'
import { prisma } from "@config/prisma";
import { updateSummarySchema, updatePersonalInfoSchema, updateHourlyRateSchema } from "./ProfileValidation";
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

  // Upsert personal info with title and about
  const personalInfo = await prisma.personalInfo.upsert({
    where: {
      user_id: userId,
    },
    update: {
      title: value.title,
      about: value.about,
    },
    create: {
      user_id: userId,
      title: value.title,
      about: value.about,
    },
  });

  // Get user with personal info for response
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      personalInfo: true,
    },
  });

  return ApiResponse.success(res, user, "Profile summary updated successfully");
}

export async function updatePersonalInfo(req: Request, res: Response) {
  const rawBody = req.body || {};

  const { value, error } = updatePersonalInfoSchema.validate(rawBody, {
    abortEarly: false,
  });
  if (error) {
    return ApiResponse.joiValidationError(res, error);
  }

  const userId = req.user.id;

  // Upsert personal info with all personal data including links
  const personalInfo = await prisma.personalInfo.upsert({
    where: {
      user_id: userId,
    },
    update: {
      address: value.address,
      address_line_2: value.address_line_2,
      zipCode: value.zipCode,
      country_id: value.countryId,
      state_id: value.stateId,
      city: value.city,
      website: value.website,
      links: value.links,
    },
    create: {
      user_id: userId,
      address: value.address,
      address_line_2: value.address_line_2,
      zipCode: value.zipCode,
      country_id: value.countryId,
      state_id: value.stateId,
      city: value.city,
      website: value.website,
      links: value.links,
    },
  });

  // Get user for response
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      personalInfo: true,
    },
  });

  return ApiResponse.success(res, user, "Personal information updated successfully");
}

export async function updatePrivacySettings(req: Request, res: Response) {
  const rawBody = req.body || {};

  // Simple validation for privacy settings
  const { hideEmail, hidePhone } = rawBody;
  
  if (hideEmail !== undefined && typeof hideEmail !== 'boolean') {
    return ApiResponse.error(res, "hideEmail must be a boolean", 400);
  }
  
  if (hidePhone !== undefined && typeof hidePhone !== 'boolean') {
    return ApiResponse.error(res, "hidePhone must be a boolean", 400);
  }

  const userId = req.user.id;

  try {
    const updateData: any = {};
    if (hideEmail !== undefined) updateData.hideEmail = hideEmail;
    if (hidePhone !== undefined) updateData.hidePhone = hidePhone;

    const user = await prisma.user.update({
      where: {
        id: userId,
      },
      data: updateData,
    });

    return ApiResponse.success(res, user, "Privacy settings updated successfully");
  } catch (error: any) {
    console.error("Update Privacy Settings Error:", error);
    return ApiResponse.error(res, "Failed to update privacy settings");
  }
}

export async function uploadProfileImage(req: Request, res: Response) {
  try {
    if (!req.file) {
      return ApiResponse.error(res, "No file uploaded", 400);
    }

    const userId = req.user.id;
    const imagePath = getRelativePath(req.file.path);
    const imageUrl = getFileUrl(imagePath);

    // Update user's profile image in database (store relative path)
    const user = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        profileImage: imagePath,
      },
    });

    return ApiResponse.success(
      res,
      { imageUrl }, // Return full URL for frontend
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
    const imagePath = getRelativePath(req.file.path);
    const imageUrl = getFileUrl(imagePath);
    
    // Update user's cover image in database (store relative path)
    const user = await prisma.user.update({
      where: { id: userId },
      data: { coverImage: imagePath },
    });

    return ApiResponse.success(
      res,
      { imageUrl }, // Return full URL for frontend
      "Cover image uploaded successfully"
    );
  } catch (error) {
    console.error("Error uploading cover image:", error);
    return ApiResponse.error(res, "Failed to upload cover image", 500);
  }
}

export async function updateHourlyRate(req: Request, res: Response) {
  const rawBody = req.body || {};

  const { value, error } = updateHourlyRateSchema.validate(rawBody, {
    abortEarly: false,
  });
  if (error) {
    return ApiResponse.joiValidationError(res, error);
  }

  const userId = req.user.id;

  try {
    // Upsert personal info with hourly rate and currency
    const personalInfo = await prisma.personalInfo.upsert({
      where: {
        user_id: userId,
      },
      update: {
        hourly_rate: value.hourly_rate,
        currency_id: value.currency_id,
      },
      create: {
        user_id: userId,
        hourly_rate: value.hourly_rate,
        currency_id: value.currency_id,
      },
    });

    // Get user for response
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        personalInfo: true,
      },
    });

    return ApiResponse.success(res, user, "Hourly rate updated successfully");
  } catch (error: any) {
    console.error("Update Hourly Rate Error:", error);
    return ApiResponse.error(res, "Failed to update hourly rate");
  }
}

export async function updateLanguages(req: Request, res: Response) {
  const rawBody = req.body || {};

  // Simple validation for languages
  const { languages } = rawBody;
  
  if (languages && !Array.isArray(languages)) {
    return ApiResponse.error(res, "Languages must be an array", 400);
  }

  const userId = req.user.id;

  try {
    // Upsert personal info with languages
    const personalInfo = await prisma.personalInfo.upsert({
      where: {
        user_id: userId,
      },
      update: {
        languages: languages,
      },
      create: {
        user_id: userId,
        languages: languages,
      },
    });

    // Get user with personal info for response
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        personalInfo: true,
      },
    });

    return ApiResponse.success(res, user, "Languages updated successfully");
  } catch (error: any) {
    console.error("Update Languages Error:", error);
    return ApiResponse.error(res, "Failed to update languages");
  }
}

export async function updateAgencySettings(req: Request, res: Response) {
  const rawBody = req.body || {};

  // Simple validation for agency settings
  const { show_as_agency, agencyName, cin } = rawBody;
  
  if (show_as_agency !== undefined && typeof show_as_agency !== 'boolean') {
    return ApiResponse.error(res, "show_as_agency must be a boolean", 400);
  }

  const userId = req.user.id;

  try {
    const updateData: any = {};
    if (show_as_agency !== undefined) updateData.show_as_agency = show_as_agency;

    const user = await prisma.user.update({
      where: {
        id: userId,
      },
      data: updateData,
      include: {
        personalInfo: true,
      },
    });

    return ApiResponse.success(res, user, "Agency settings updated successfully");
  } catch (error: any) {
    console.error("Update Agency Settings Error:", error);
    return ApiResponse.error(res, "Failed to update agency settings");
  }
}