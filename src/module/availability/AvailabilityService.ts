import { prisma } from '@services/prismaService';
import { ServiceResponse } from '@utils/ApiResponse';
import { Log } from '@services/loggerService';

interface TimeSlot {
  from: string; // "09:00"
  to: string;   // "17:00"
}

interface AvailabilityDay {
  day: string;
  time: TimeSlot[];
}

export class AvailabilityService {
  /**
   * Save or update user's availability schedule.
   */
  static async saveAvailability(
    userId: number,
    data: {
      timezone: string;
      availability: AvailabilityDay[];
      unavailability?: string[];
      restBreak?: number;
    }
  ): Promise<ServiceResponse> {
    try {
      const result = await (prisma as any).availability.upsert({
        where: { user_id: userId },
        update: {
          timezone: data.timezone,
          schedule: data.availability,
          unavailability: data.unavailability ?? [],
          rest_break: data.restBreak ? Number(data.restBreak) : null,
        },
        create: {
          user_id: userId,
          timezone: data.timezone,
          schedule: data.availability,
          unavailability: data.unavailability ?? [],
          rest_break: data.restBreak ? Number(data.restBreak) : null,
        },
      });

      return {
        success: true,
        message: 'Availability saved',
        data: AvailabilityService.transform(result),
      };
    } catch (error: any) {
      Log.error('Save availability error', { error });
      return { success: false, message: error.message || 'Failed to save availability' };
    }
  }

  /**
   * Get current user's availability.
   */
  static async getAvailability(userId: number): Promise<ServiceResponse> {
    try {
      const record = await (prisma as any).availability.findUnique({
        where: { user_id: userId },
      });

      return {
        success: true,
        message: record ? 'Availability fetched' : 'No availability set',
        data: record ? AvailabilityService.transform(record) : null,
      };
    } catch (error: any) {
      Log.error('Get availability error', { error });
      return { success: false, message: error.message || 'Failed to fetch availability' };
    }
  }

  /**
   * Get public availability for any user (by unique_id).
   */
  static async getPublicAvailability(userUniqueId: string): Promise<ServiceResponse> {
    try {
      const user = await prisma.user.findFirst({
        where: { unique_id: userUniqueId },
        select: { id: true },
      });
      if (!user) return { success: false, message: 'User not found' };

      const record = await (prisma as any).availability.findUnique({
        where: { user_id: user.id },
      });

      return {
        success: true,
        message: record ? 'Availability fetched' : 'No availability set',
        data: record ? AvailabilityService.transform(record) : null,
      };
    } catch (error: any) {
      Log.error('Get public availability error', { error });
      return { success: false, message: error.message || 'Failed to fetch availability' };
    }
  }

  private static transform(record: any) {
    return {
      timezone: record.timezone,
      availability: record.schedule ?? [],
      unavailability: record.unavailability ?? [],
      restBreak: record.rest_break,
    };
  }
}
