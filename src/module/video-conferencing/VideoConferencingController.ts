import { Request, Response } from 'express';
import { ApiResponse } from '@utils/ApiResponse';
import { Log } from '@services/loggerService';
import { ZoomService } from './ZoomService';
import { MsTeamsService } from './MsTeamsService';
import { MeetingService } from './MeetingService';
import { prisma } from '@services/prismaService';

export class VideoConferencingController {
  // ── Zoom ───────────────────────────────────────────────
  static async zoomAuthUrl(req: Request, res: Response) {
    try {
      const redirectUri = req.query.redirectUri as string;
      if (!redirectUri) return ApiResponse.error(res, 'redirectUri query parameter is required');
      const url = ZoomService.getAuthUrl(redirectUri);
      return ApiResponse.success(res, { url }, 'Zoom auth URL generated');
    } catch (err: any) {
      Log.error('Zoom getAuthUrl error', err);
      return ApiResponse.error(res, 'Failed to generate Zoom auth URL');
    }
  }

  static async zoomCallback(req: Request, res: Response) {
    try {
      const { code, redirectUri } = req.body;
      if (!code || !redirectUri) return ApiResponse.error(res, 'code and redirectUri are required');
      const result = await ZoomService.handleCallback(req.user.id, code, redirectUri);
      return ApiResponse.success(res, result, 'Zoom connected');
    } catch (err: any) {
      Log.error('Zoom callback error', err);
      return ApiResponse.error(res, err.message || 'Failed to connect Zoom');
    }
  }

  static async zoomDisconnect(req: Request, res: Response) {
    try {
      await ZoomService.disconnect(req.user.id);
      return ApiResponse.success(res, null, 'Zoom disconnected');
    } catch (err: any) {
      Log.error('Zoom disconnect error', err);
      return ApiResponse.error(res, 'Failed to disconnect Zoom');
    }
  }

  static async zoomStatus(req: Request, res: Response) {
    try {
      const status = await ZoomService.getStatus(req.user.id);
      return ApiResponse.success(res, status, 'Zoom status');
    } catch (err: any) {
      Log.error('Zoom status error', err);
      return ApiResponse.error(res, 'Failed to get Zoom status');
    }
  }

  // ── Microsoft Teams ────────────────────────────────────
  static async msTeamsAuthUrl(req: Request, res: Response) {
    try {
      const redirectUri = req.query.redirectUri as string;
      if (!redirectUri) return ApiResponse.error(res, 'redirectUri query parameter is required');
      const url = MsTeamsService.getAuthUrl(redirectUri);
      return ApiResponse.success(res, { url }, 'Microsoft Teams auth URL generated');
    } catch (err: any) {
      Log.error('MS Teams getAuthUrl error', err);
      return ApiResponse.error(res, 'Failed to generate Microsoft Teams auth URL');
    }
  }

  static async msTeamsCallback(req: Request, res: Response) {
    try {
      const { code, redirectUri } = req.body;
      if (!code || !redirectUri) return ApiResponse.error(res, 'code and redirectUri are required');
      const result = await MsTeamsService.handleCallback(req.user.id, code, redirectUri);
      return ApiResponse.success(res, result, 'Microsoft Teams connected');
    } catch (err: any) {
      Log.error('MS Teams callback error', err);
      return ApiResponse.error(res, err.message || 'Failed to connect Microsoft Teams');
    }
  }

  static async msTeamsDisconnect(req: Request, res: Response) {
    try {
      await MsTeamsService.disconnect(req.user.id);
      return ApiResponse.success(res, null, 'Microsoft Teams disconnected');
    } catch (err: any) {
      Log.error('MS Teams disconnect error', err);
      return ApiResponse.error(res, 'Failed to disconnect Microsoft Teams');
    }
  }

  static async msTeamsStatus(req: Request, res: Response) {
    try {
      const status = await MsTeamsService.getStatus(req.user.id);
      return ApiResponse.success(res, status, 'Microsoft Teams status');
    } catch (err: any) {
      Log.error('MS Teams status error', err);
      return ApiResponse.error(res, 'Failed to get Microsoft Teams status');
    }
  }

  // ── Aggregate status ──────────────────────────────────
  static async getStatus(req: Request, res: Response) {
    try {
      const status = await MeetingService.getStatus(req.user.id);
      return ApiResponse.success(res, status, 'Video conferencing status');
    } catch (err: any) {
      Log.error('Video conferencing status error', err);
      return ApiResponse.error(res, 'Failed to get video conferencing status');
    }
  }

  // ── Default provider preference ────────────────────────
  static async savePreference(req: Request, res: Response) {
    try {
      const { meetingProvider } = req.body;
      const valid = ['zoom', 'google_meet', 'ms_teams', null];
      if (!valid.includes(meetingProvider)) {
        return ApiResponse.error(res, 'Invalid meeting provider');
      }

      await (prisma as any).mentorOnRequest.upsert({
        where: { user_id: req.user.id },
        update: { default_meeting_provider: meetingProvider || null },
        create: { user_id: req.user.id, default_meeting_provider: meetingProvider || null },
      });

      return ApiResponse.success(res, { meetingProvider }, 'Meeting preference saved');
    } catch (err: any) {
      Log.error('Save meeting preference error', err);
      return ApiResponse.error(res, 'Failed to save meeting preference');
    }
  }

  static async getPreference(req: Request, res: Response) {
    try {
      const settings = await (prisma as any).mentorOnRequest.findUnique({
        where: { user_id: req.user.id },
        select: { default_meeting_provider: true },
      });
      return ApiResponse.success(res, {
        meetingProvider: settings?.default_meeting_provider ?? null,
      }, 'Meeting preference');
    } catch (err: any) {
      Log.error('Get meeting preference error', err);
      return ApiResponse.error(res, 'Failed to get meeting preference');
    }
  }
}
