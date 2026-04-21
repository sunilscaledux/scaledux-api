import { prisma } from '@services/prismaService';
import { Log } from '@services/loggerService';
import { ZoomService } from './ZoomService';
import { MsTeamsService } from './MsTeamsService';
import { GoogleMeetService } from './GoogleMeetService';

type MeetingProvider = 'zoom' | 'google_meet' | 'ms_teams';

interface BookingInfo {
  title: string;
  scheduledAt: Date;
  duration: number;
}

export class MeetingService {
  /**
   * Generate a meeting link using the specified provider.
   * Throws if the mentor doesn't have the provider connected.
   */
  static async generateMeetingLink(
    mentorId: number,
    provider: MeetingProvider,
    booking: BookingInfo
  ): Promise<{ link: string; provider: string }> {
    const { title, scheduledAt, duration } = booking;

    switch (provider) {
      case 'zoom': {
        const link = await ZoomService.createMeeting(mentorId, title, scheduledAt, duration);
        return { link, provider: 'zoom' };
      }
      case 'google_meet': {
        const link = await GoogleMeetService.createMeeting(mentorId, title, scheduledAt, duration);
        return { link, provider: 'google_meet' };
      }
      case 'ms_teams': {
        const link = await MsTeamsService.createMeeting(mentorId, title, scheduledAt, duration);
        return { link, provider: 'ms_teams' };
      }
      default:
        throw new Error(`Unsupported meeting provider: ${provider}`);
    }
  }

  /** Get aggregate connection status for all video providers. */
  static async getStatus(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        zoom_refresh_token: true,
        zoom_email: true,
        zoom_connected_at: true,
        google_calendar_refresh_token: true,
        google_calendar_email: true,
        google_calendar_connected_at: true,
        ms_teams_refresh_token: true,
        ms_teams_email: true,
        ms_teams_connected_at: true,
      },
    });

    const mentorSettings = await (prisma as any).mentorOnRequest.findUnique({
      where: { user_id: userId },
      select: { default_meeting_provider: true },
    });

    return {
      zoom: {
        connected: !!user?.zoom_refresh_token,
        email: user?.zoom_email ?? null,
        connectedAt: user?.zoom_connected_at?.toISOString() ?? null,
      },
      googleMeet: {
        connected: !!user?.google_calendar_refresh_token,
        email: user?.google_calendar_email ?? null,
        connectedAt: user?.google_calendar_connected_at?.toISOString() ?? null,
      },
      msTeams: {
        connected: !!user?.ms_teams_refresh_token,
        email: user?.ms_teams_email ?? null,
        connectedAt: user?.ms_teams_connected_at?.toISOString() ?? null,
      },
      defaultProvider: mentorSettings?.default_meeting_provider ?? null,
    };
  }
}
