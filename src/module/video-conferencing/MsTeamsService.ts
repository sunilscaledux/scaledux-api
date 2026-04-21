import axios from 'axios';
import { prisma } from '@services/prismaService';
import { Log } from '@services/loggerService';

const MS_AUTH_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
const MS_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
const MS_GRAPH_BASE = 'https://graph.microsoft.com/v1.0';
const MS_SCOPES = 'OnlineMeetings.ReadWrite offline_access User.Read';

export class MsTeamsService {
  static getAuthUrl(redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: process.env.MS_TEAMS_CLIENT_ID!,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: MS_SCOPES,
    });
    return `${MS_AUTH_URL}?${params.toString()}`;
  }

  static async handleCallback(userId: number, code: string, redirectUri: string) {
    const tokenRes = await axios.post(MS_TOKEN_URL, new URLSearchParams({
      client_id: process.env.MS_TEAMS_CLIENT_ID!,
      client_secret: process.env.MS_TEAMS_CLIENT_SECRET!,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }).toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const { access_token, refresh_token } = tokenRes.data;
    if (!refresh_token) {
      throw new Error('No refresh token received from Microsoft.');
    }

    const userRes = await axios.get(`${MS_GRAPH_BASE}/me`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const email: string = userRes.data.mail || userRes.data.userPrincipalName;

    await prisma.user.update({
      where: { id: userId },
      data: {
        ms_teams_refresh_token: refresh_token,
        ms_teams_email: email,
        ms_teams_connected_at: new Date(),
      },
    });

    Log.info(`Microsoft Teams connected for user ${userId} (${email})`);
    return { email };
  }

  static async disconnect(userId: number) {
    await prisma.user.update({
      where: { id: userId },
      data: { ms_teams_refresh_token: null, ms_teams_email: null, ms_teams_connected_at: null },
    });
    Log.info(`Microsoft Teams disconnected for user ${userId}`);
  }

  static async getStatus(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { ms_teams_email: true, ms_teams_connected_at: true, ms_teams_refresh_token: true },
    });
    return {
      connected: !!user?.ms_teams_refresh_token,
      email: user?.ms_teams_email ?? null,
      connectedAt: user?.ms_teams_connected_at?.toISOString() ?? null,
    };
  }

  static async getAccessToken(userId: number): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { ms_teams_refresh_token: true },
    });
    if (!user?.ms_teams_refresh_token) throw new Error('Microsoft Teams not connected');

    const res = await axios.post(MS_TOKEN_URL, new URLSearchParams({
      client_id: process.env.MS_TEAMS_CLIENT_ID!,
      client_secret: process.env.MS_TEAMS_CLIENT_SECRET!,
      grant_type: 'refresh_token',
      refresh_token: user.ms_teams_refresh_token,
    }).toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    if (res.data.refresh_token && res.data.refresh_token !== user.ms_teams_refresh_token) {
      await prisma.user.update({
        where: { id: userId },
        data: { ms_teams_refresh_token: res.data.refresh_token },
      });
    }

    return res.data.access_token;
  }

  static async createMeeting(
    userId: number,
    subject: string,
    startTime: Date,
    durationMinutes: number
  ): Promise<string> {
    const accessToken = await this.getAccessToken(userId);

    const endTime = new Date(startTime.getTime() + durationMinutes * 60_000);

    const res = await axios.post(
      `${MS_GRAPH_BASE}/me/onlineMeetings`,
      {
        subject,
        startDateTime: startTime.toISOString(),
        endDateTime: endTime.toISOString(),
      },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    return res.data.joinWebUrl;
  }
}
