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
      throw new Error('Google Meet link was not generated. The calendar may not support Meet.');
    }

    return meetLink;
  }

  /**
   * Create a Google Calendar event with a Meet link on the host's primary
   * calendar, inviting the given attendees. With sendUpdates=all, Google emails
   * the invites and the event auto-appears on any attendee who uses Google
   * Calendar. Returns the Meet link and the created event id.
   */
  static async createBookingEvent(params: {
    hostUserId: number;
    summary: string;
    description?: string;
    startTime: Date;
    durationMinutes: number;
    attendeeEmails: string[];
  }): Promise<{ meetLink: string; eventId: string }> {
    const { hostUserId, summary, description, startTime, durationMinutes, attendeeEmails } = params;
    const accessToken = await this.getAccessToken(hostUserId);
    const endTime = new Date(startTime.getTime() + durationMinutes * 60_000);

    const res = await axios.post(
      `${GOOGLE_CALENDAR_API}/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all`,
      {
        summary,
        description,
        start: { dateTime: startTime.toISOString() },
        end: { dateTime: endTime.toISOString() },
        attendees: attendeeEmails.filter(Boolean).map((email) => ({ email })),
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
    const eventId = res.data.id;
    if (!meetLink) {
      throw new Error('Google Meet link was not generated. The calendar may not support Meet.');
    }

    return { meetLink, eventId };
  }

  /**
   * Patch the time of an existing booking event (used on reschedule) and
   * re-notify attendees. Returns the (unchanged) Meet link and event id.
   */
  static async updateBookingEvent(params: {
    hostUserId: number;
    eventId: string;
    startTime: Date;
    durationMinutes: number;
  }): Promise<{ meetLink: string; eventId: string }> {
    const { hostUserId, eventId, startTime, durationMinutes } = params;
    const accessToken = await this.getAccessToken(hostUserId);
    const endTime = new Date(startTime.getTime() + durationMinutes * 60_000);

    const res = await axios.patch(
      `${GOOGLE_CALENDAR_API}/calendars/primary/events/${eventId}?sendUpdates=all`,
      {
        start: { dateTime: startTime.toISOString() },
        end: { dateTime: endTime.toISOString() },
      },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    return { meetLink: res.data.hangoutLink, eventId: res.data.id };
  }
}
