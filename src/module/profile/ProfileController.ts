import { Request, Response } from 'express';
import { PersonalInfoService } from './ProfileService';
import { ApiResponse } from '@utils/ApiResponse';
import { updateSummarySchema, updatePersonalInfoSchema, updateHourlyRateSchema, updateAvailableHoursPerWeekSchema, updatePasswordSchema, setPasswordSchema, updateNameSchema } from './ProfileValidation';
import { getPublicReviewsByProfileUniqueId } from '../review/ReviewService';
import { ConnectionService } from '../connection/ConnectionService';
import { prisma } from '@services/prismaService';
import { getResubmitWindow } from '@utils/General';
import { appConfig } from '@config/app';

export class ProfileController {

  static async getMyProfile(req: Request, res: Response) {
    const userId = req.user.id;
    const result = await PersonalInfoService.getProfileByUserId(userId);

    if (result.success) {
      return ApiResponse.success(res, result.data, result.message);
    } else {
      return ApiResponse.error(res, result.message, 404);
    }
  }

  static async updateSummary(req: Request, res: Response) {
    const { value, error } = updateSummarySchema.validate(req.body, { abortEarly: false });
    if (error) {
      return ApiResponse.joiValidationError(res, error);
    }

    const userId = req.user.id;
    const result = await PersonalInfoService.updateProfileSummary(userId, value);

    if (result.success) {
      return ApiResponse.success(res, result.data, result.message);
    } else {
      return ApiResponse.error(res, result.message);
    }
  }

  /**
   * Update freelancer personal info
   * PATCH /api/v1/profile/freelancer/personal-info
   */
  static async updatePersonalInfo(req: Request, res: Response) {
    const { value, error } = updatePersonalInfoSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return ApiResponse.joiValidationError(res, error);
    }

    const userId = req.user.id;
    const result = await PersonalInfoService.updatePersonalInfo(userId, value);

    if (result.success) {
      return ApiResponse.success(res, result.data, result.message);
    } else {
      return ApiResponse.error(res, result.message);
    }
  }

  /**
   * Update hourly rate
   * PATCH /api/v1/profile/freelancer/hourly-rate
   */
  static async updateHourlyRate(req: Request, res: Response) {
    const { value, error } = updateHourlyRateSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return ApiResponse.joiValidationError(res, error);
    }

    const userId = req.user.id;
    const result = await PersonalInfoService.updateHourlyRate(userId, value);

    if (result.success) {
      return ApiResponse.success(res, result.data, result.message);
    } else {
      return ApiResponse.error(res, result.message);
    }
  }

  /**
   * Update available hours per week (freelancer)
   * PATCH /api/v1/profile/available-hours-per-week
   */
  static async updateAvailableHoursPerWeek(req: Request, res: Response) {
    const { value, error } = updateAvailableHoursPerWeekSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return ApiResponse.joiValidationError(res, error);
    }

    const userId = req.user.id;
    const result = await PersonalInfoService.updateAvailableHoursPerWeek(userId, value);

    if (result.success) {
      return ApiResponse.success(res, result.data, result.message);
    } else {
      return ApiResponse.error(res, result.message);
    }
  }

  /**
   * Update languages
   * PATCH /api/v1/profile/freelancer/languages
   */
  static async updateLanguages(req: Request, res: Response) {
    const { languages } = req.body;

    if (!Array.isArray(languages)) {
      return ApiResponse.error(res, 'Languages must be an array', 400);
    }

    const userId = req.user.id;
    const result = await PersonalInfoService.updateLanguages(userId, languages);

    if (result.success) {
      return ApiResponse.success(res, result.data, result.message);
    } else {
      return ApiResponse.error(res, result.message);
    }
  }

  /**
   * Upload profile image
   * POST /api/v1/profile/freelancer/profile-image
   */
  static async uploadProfileImage(req: Request, res: Response) {
    if (!req.file) {
      return ApiResponse.error(res, 'No file uploaded', 400);
    }

    const userId = req.user.id;
    const profileType = req.body.profile_type || 'freelancer';
    const attachmentMeta = (req as any).attachmentMeta?.[0];
    const result = await PersonalInfoService.uploadProfileImage(userId, req.file, profileType, attachmentMeta);

    if (result.success) {
      return ApiResponse.success(res, result.data, result.message);
    } else {
      return ApiResponse.error(res, result.message);
    }
  }

  /**
   * Upload cover image
   * POST /api/v1/profile/freelancer/cover-image
   */
  static async uploadCoverImage(req: Request, res: Response) {
    if (!req.file) {
      return ApiResponse.error(res, 'No file uploaded', 400);
    }

    const userId = req.user.id;
    const profileType = req.body.profile_type || 'freelancer';
    const attachmentMeta = (req as any).attachmentMeta?.[0];
    const result = await PersonalInfoService.uploadCoverImage(userId, req.file, profileType, attachmentMeta);

    if (result.success) {
      return ApiResponse.success(res, result.data, result.message);
    } else {
      return ApiResponse.error(res, result.message);
    }
  }

  /**
   * Get password status (hasPassword, provider) for "Set password" vs "Change password" UI.
   * GET /api/v1/profile/password-status
   */
  static async getPasswordStatus(req: Request, res: Response) {
    const userId = req.user.id;
    const result = await PersonalInfoService.getPasswordStatus(userId);
    if (result.success && result.data) {
      return ApiResponse.success(res, result.data, result.message);
    }
    return ApiResponse.error(res, result.message || 'Failed to get password status', 400);
  }

  /**
   * Set password for Google/LinkedIn users who have no password (no current password required).
   * PATCH /api/v1/profile/set-password
   */
  static async setPassword(req: Request, res: Response) {
    const { value, error } = setPasswordSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return ApiResponse.joiValidationError(res, error);
    }
    const userId = req.user.id;
    const result = await PersonalInfoService.setPassword(userId, value.new_password);
    if (result.success) {
      return ApiResponse.success(res, result.data, result.message);
    }
    return ApiResponse.error(res, result.message, 400);
  }

  /**
   * Update password (current password required). Use when user already has a password.
   * PATCH /api/v1/profile/password
   */
  static async updatePassword(req: Request, res: Response) {
    const { value, error } = updatePasswordSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return ApiResponse.joiValidationError(res, error);
    }
    const userId = req.user.id;
    const result = await PersonalInfoService.updatePassword(
      userId,
      value.current_password,
      value.new_password
    );
    if (result.success) {
      return ApiResponse.success(res, result.data, result.message);
    }
    return ApiResponse.error(res, result.message, 400);
  }

  /**
   * Update privacy settings
   * PATCH /api/v1/profile/freelancer/privacy
   */
  static async updatePrivacySettings(req: Request, res: Response) {
    const { hideEmail, hidePhone } = req.body;

    if (hideEmail !== undefined && typeof hideEmail !== 'boolean') {
      return ApiResponse.error(res, 'hideEmail must be a boolean', 400);
    }

    if (hidePhone !== undefined && typeof hidePhone !== 'boolean') {
      return ApiResponse.error(res, 'hidePhone must be a boolean', 400);
    }

    const userId = req.user.id;
    const result = await PersonalInfoService.updatePrivacySettings(userId, hideEmail, hidePhone);

    if (result.success) {
      return ApiResponse.success(res, result.data, result.message);
    } else {
      return ApiResponse.error(res, result.message);
    }
  }

  /**
   * Update agency settings
   * PATCH /api/v1/profile/freelancer/agency-settings
   */
  static async updateAgencySettings(req: Request, res: Response) {
    const { show_as_agency } = req.body;

    if (show_as_agency !== undefined && typeof show_as_agency !== 'boolean') {
      return ApiResponse.error(res, 'show_as_agency must be a boolean', 400);
    }

    const userId = req.user.id;
    const result = await PersonalInfoService.updateAgencySettings(userId, show_as_agency);

    if (result.success) {
      return ApiResponse.success(res, result.data, result.message);
    } else {
      return ApiResponse.error(res, result.message);
    }
  }

  /**
   * Get PUBLIC reviews received by this profile (by unique_id). For profile page.
   * GET /api/v1/profile/:uniqueId/reviews?limit=20&offset=0
   */
  static async getPublicProfileReviews(req: Request, res: Response) {
    const rawId = req.params.uniqueId;
    const uniqueId = typeof rawId === 'string' ? rawId : rawId?.[0];
    if (!uniqueId) return ApiResponse.error(res, 'Unique ID is required', 400);
    const limit = req.query.limit != null ? Number(req.query.limit) : 20;
    const offset = req.query.offset != null ? Number(req.query.offset) : 0;
    const result = await getPublicReviewsByProfileUniqueId(uniqueId, { limit, offset });
    if (!result.success) return ApiResponse.error(res, result.message!, 404);
    return ApiResponse.success(res, result.data, result.message!);
  }

  /**
   * Get public profile by unique_id
   * GET /api/v1/profile/:uniqueId
   */
  static async getPublicProfile(req: Request, res: Response) {
    const rawId = req.params.uniqueId;
    const uniqueId = typeof rawId === 'string' ? rawId : rawId?.[0];

    if (!uniqueId) {
      return ApiResponse.error(res, 'Unique ID is required', 400);
    }

    // Check if target user has blocked the viewer — skip for own profile
    const viewerId = req.user?.id;
    if (viewerId) {
      const targetUser = await prisma.user.findUnique({ where: { unique_id: uniqueId }, select: { id: true } });
      if (targetUser && targetUser.id !== viewerId) {
        const block = await (prisma as any).blockedUser.findFirst({
          where: {
            blocker_id: targetUser.id,
            blocked_user_id: viewerId,
          },
        });
        if (block) {
          return ApiResponse.error(res, 'This profile is not available', null, 403);
        }
      }
    }

    const personalInfo = await PersonalInfoService.getProfileByUniqueId(uniqueId);

    if (personalInfo.success) {
      // Include connection status if viewer is authenticated
      let connection = null;
      if (viewerId) {
        const connResult = await ConnectionService.getConnectionStatus(viewerId, uniqueId);
        if (connResult.success) {
          connection = connResult.data;
        }
      }
      return ApiResponse.success(res, { ...personalInfo.data, connection }, personalInfo.message);
    }
    return ApiResponse.error(res, 'Profile not found', null, 404);
  }

  static async verifyPassword(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) return ApiResponse.error(res, 'User not authenticated', 401);
    const { password } = req.body;
    if (!password) return ApiResponse.error(res, 'Password is required', 400);
    const result = await PersonalInfoService.verifyPassword(userId, password);
    if (!result.success) return ApiResponse.error(res, result.message, 400);
    return ApiResponse.success(res, null, 'Password verified');
  }

  /**
   * Update name with 15-day cooldown
   * PATCH /api/v1/profile/name
   */
  static async updateName(req: Request, res: Response) {
    const { value, error } = updateNameSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return ApiResponse.joiValidationError(res, error);
    }

    const userId = req.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name_updated_at: true },
    });

    const cooldown = getResubmitWindow(user?.name_updated_at, appConfig.verification.nameCooldownDays);
    if (!cooldown.canSubmit) {
      return ApiResponse.error(
        res,
        `Name was recently updated. You can update again after ${cooldown.nextSubmitAllowedAt?.toISOString().split('T')[0]}.`,
        null,
        429
      );
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        first_name: value.first_name,
        last_name: value.last_name || null,
        name_updated_at: new Date(),
      },
      select: { first_name: true, last_name: true, name_updated_at: true },
    });

    return ApiResponse.success(res, updated, 'Name updated successfully');
  }

  /**
   * Get name update status (cooldown info)
   * GET /api/v1/profile/name-status
   */
  static async getNameStatus(req: Request, res: Response) {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { first_name: true, last_name: true, name_updated_at: true },
    });

    const cooldown = getResubmitWindow(user?.name_updated_at, appConfig.verification.nameCooldownDays);

    return ApiResponse.success(res, {
      firstName: user?.first_name,
      lastName: user?.last_name,
      canEdit: cooldown.canSubmit,
      nextEditAllowedAt: cooldown.nextSubmitAllowedAt,
      cooldownDays: appConfig.verification.nameCooldownDays,
    }, 'Name status');
  }
}
