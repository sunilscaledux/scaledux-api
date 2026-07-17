import axios from 'axios';
import { prisma } from '@services/prismaService';
import { Log } from '@services/loggerService';

const ZOOM_AUTH_URL = 'https://zoom.us/oauth/authorize';
const ZOOM_TOKEN_URL = 'https://zoom.us/oauth/token';
const ZOOM_REVOKE_URL = 'https://zoom.us/oauth/revoke';
const ZOOM_API_BASE = 'https://api.zoom.us/v2';

export class ZoomService {
  static getAuthUrl(redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: process.env.ZOOM_CLIENT_ID!,
      redirect_uri: redirectUri,
      response_type: 'code',
    });
    return `${ZOOM_AUTH_URL}?${params.toString()}`;
  }

  static async handleCallback(userId: number, code: string, redirectUri: string) {
    const basicAuth = Buffer.from(
      `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`
    ).toString('base64');

    const tokenRes = await axios.post(
      ZOOM_TOKEN_URL,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }).toString(),
      { headers: { Authorization: `Basic ${basicAuth}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const { access_token, refresh_token } = tokenRes.data;
    if (!refresh_token) {
      throw new Error('No refresh token received from Zoom.');
    }

    const userRes = await axios.get(`${ZOOM_API_BASE}/users/me`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const email: string = userRes.data.email;

    await prisma.user.update({
      where: { id: userId },
      data: {
        zoom_refresh_token: refresh_token,
        zoom_email: email,
        zoom_connected_at: new Date(),
      },
    });

    Log.info(`Zoom connected for user ${userId} (${email})`);
    return { email };
  }

  static async disconnect(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { zoom_refresh_token: true },
    });

    if (user?.zoom_refresh_token) {
      try {
        const basicAuth = Buffer.from(
          `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`
        ).toString('base64');
        await axios.post(
          ZOOM_REVOKE_URL,
          new URLSearchParams({ token: user.zoom_refresh_token }).toString(),
          { headers: { Authorization: `Basic ${basicAuth}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
      } catch (err) {
        Log.warn(`Zoom token revoke failed for user ${userId}, clearing locally anyway`);
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { zoom_refresh_token: null, zoom_email: null, zoom_connected_at: null },
    });

    Log.info(`Zoom disconnected for user ${userId}`);
  }

  static async getStatus(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { zoom_email: true, zoom_connected_at: true, zoom_refresh_token: true },
    });
    return {
      connected: !!user?.zoom_refresh_token,
      email: user?.zoom_email ?? null,
      connectedAt: user?.zoom_connected_at?.toISOString() ?? null,
    };
  }

  static async getAccessToken(userId: number): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { zoom_refresh_token: true },
    });
    if (!user?.zoom_refresh_token) throw new Error('Zoom not connected');

    const basicAuth = Buffer.from(
      `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`
    ).toString('base64');

    const res = await axios.post(
      ZOOM_TOKEN_URL,
      new URLSearchParams({ grant_type: 'refresh_token', refresh_token: user.zoom_refresh_token }).toString(),
      { headers: { Authorization: `Basic ${basicAuth}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    // Persist new refresh token if rotated
    if (res.data.refresh_token && res.data.refresh_token !== user.zoom_refresh_token) {
      await prisma.user.update({
        where: { id: userId },
        data: { zoom_refresh_token: res.data.refresh_token },
      });
    }

    return res.data.access_token;
  }

  static async createMeeting(
    userId: number,
    topic: string,
    startTime: Date,
    durationMinutes: number
  ): Promise<string> {
    const accessToken = await this.getAccessToken(userId);

    const res = await axios.post(
      `${ZOOM_API_BASE}/users/me/meetings`,
      {
        topic,
        type: 2, // scheduled
        start_time: startTime.toISOString(),
        duration: durationMinutes,
        settings: { join_before_host: true, waiting_room: false },
      },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    return res.data.join_url;
  }
}
