import { Request, Response, NextFunction } from 'express';
import { prisma } from '@services/prismaService';
import { ApiResponse } from '@utils/ApiResponse';
import { Log } from '@services/loggerService';
import { appConfig } from '@config/app';

/**
 * Threshold is configured per environment via MIN_PROFILE_COMPLETION_PERCENT
 * and exposed on appConfig (see src/config/app.ts). Re-exported for other
 * modules that need to apply the same cut-off in Prisma queries.
 */
export const PROFILE_COMPLETION_THRESHOLD = appConfig.minProfileCompletionPercent;


export function requireCompleteProfile(minPercentage: number = PROFILE_COMPLETION_THRESHOLD) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return ApiResponse.unauthorized(res, 'Authentication required');
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { profile_completion_percentage: true },
      });

      const percentage = user?.profile_completion_percentage ?? 0;
      if (percentage < minPercentage) {
        return ApiResponse.error(
          res,
          `Please complete your profile to continue. You are ${percentage}% complete; at least ${minPercentage}% is required.`,
          { code: 'PROFILE_INCOMPLETE', percentage, required: minPercentage },
          403
        );
      }

      next();
    } catch (error) {
      Log.error('requireCompleteProfile error', { error });
      return ApiResponse.error(res, 'Failed to check profile completion', null, 500);
    }
  };
}
