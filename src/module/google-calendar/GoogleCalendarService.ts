import axios from 'axios';
import { prisma } from '@services/prismaService';
import { Log } from '@services/loggerService';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';
const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke';

const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
].join(' ');

export class GoogleCalendarService {
  /**
   * Build Google OAuth URL for calendar consent.
   */
  static getAuthUrl(redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: CALENDAR_SCOPES,
      access_type: 'offline',
      prompt: 'consent',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens, persist refresh token and connected email.
   */
  static async handleCallback(userId: number, code: string, redirectUri: string) {
    // Exchange code for tokens
    const tokenRes = await axios.post(GOOGLE_TOKEN_URL, {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    });

    const { access_token, refresh_token } = tokenRes.data;

    if (!refresh_token) {
      throw new Error('No refresh token received. The user may need to revoke access and reconnect.');
    }

    // Fetch the email associated with the Google account
    const userInfoRes = await axios.get(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const email: string = userInfoRes.data.email;

    // Store refresh token and mark as connected
    await prisma.user.update({
      where: { id: userId },
      data: {
        google_calendar_refresh_token: refresh_token,
        google_calendar_email: email,
        google_calendar_connected_at: new Date(),
      },
    });

    Log.info(`Google Calendar connected for user ${userId} (${email})`);
    return { email };
  }

  /**
   * Disconnect: revoke the token at Google and clear local data.
   */
  static async disconnect(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { google_calendar_refresh_token: true },
    });

    // Best-effort revoke at Google
    if (user?.google_calendar_refresh_token) {
      try {
        await axios.post(GOOGLE_REVOKE_URL, null, {
          params: { token: user.google_calendar_refresh_token },
        });
      } catch (err) {
        Log.warn(`Google token revoke failed for user ${userId} — clearing locally anyway`);
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        google_calendar_refresh_token: null,
        google_calendar_email: null,
        google_calendar_connected_at: null,
      },
    });

    Log.info(`Google Calendar disconnected for user ${userId}`);
  }

  /**
   * Return connection status for the authenticated user.
   */
  static async getStatus(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        google_calendar_email: true,
        google_calendar_connected_at: true,
        google_calendar_refresh_token: true,
      },
    });

    return {
      connected: !!user?.google_calendar_refresh_token,
      email: user?.google_calendar_email ?? null,
      connectedAt: user?.google_calendar_connected_at?.toISOString() ?? null,
    };
  }
}
