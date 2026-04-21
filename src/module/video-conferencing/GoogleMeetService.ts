import axios from 'axios';
import { prisma } from '@services/prismaService';
import { Log } from '@services/loggerService';
import { randomUUID } from 'crypto';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

export class GoogleMeetService {
  /** Refresh the existing Google Calendar token to get a fresh access token. */
  static async getAccessToken(userId: number): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { google_calendar_refresh_token: true },
    });
    if (!user?.google_calendar_refresh_token) throw new Error('Google Calendar not connected');

    const res = await axios.post(GOOGLE_TOKEN_URL, {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: user.google_calendar_refresh_token,
    });

    return res.data.access_token;
  }

  /**
   * Create a Google Calendar event with an auto-generated Google Meet link.
   * Returns the Meet join URL.
   */
  static async createMeeting(
    userId: number,
    title: string,
    startTime: Date,
    durationMinutes: number
  ): Promise<string> {
    const accessToken = await this.getAccessToken(userId);

    const endTime = new Date(startTime.getTime() + durationMinutes * 60_000);

    const res = await axios.post(
      `${GOOGLE_CALENDAR_API}/calendars/primary/events?conferenceDataVersion=1`,
      {
        summary: title,
        start: { dateTime: startTime.toISOString() },
        end: { dateTime: endTime.toISOString() },
        conferenceData: {
          createRequest: {
            requestId: randomUUID(),
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const meetLink = res.data.hangoutLink;
    if (!meetLink) {
      throw new Error('Google Meet link was not generated — the calendar may not support Meet.');
    }

    return meetLink;
  }
}
