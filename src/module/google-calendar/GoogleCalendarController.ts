import { Request, Response } from 'express';
import { ApiResponse } from '@utils/ApiResponse';
import { GoogleCalendarService } from './GoogleCalendarService';
import { Log } from '@services/loggerService';

export class GoogleCalendarController {
  /** GET /google-calendar/auth-url */
  static async getAuthUrl(req: Request, res: Response) {
    try {
      const redirectUri = req.query.redirectUri as string;
      if (!redirectUri) {
        return ApiResponse.error(res, 'redirectUri query parameter is required');
      }
      const url = GoogleCalendarService.getAuthUrl(redirectUri, req.user?.email);
      return ApiResponse.success(res, { url }, 'Auth URL generated');
    } catch (err: any) {
      Log.error('Google Calendar getAuthUrl error', err);
      return ApiResponse.error(res, 'Failed to generate auth URL');
    }
  }

  /** POST /google-calendar/callback */
  static async callback(req: Request, res: Response) {
    try {
      const { code, redirectUri } = req.body;
      if (!code || !redirectUri) {
        return ApiResponse.error(res, 'code and redirectUri are required');
      }
      const result = await GoogleCalendarService.handleCallback(req.user.id, code, redirectUri);
      return ApiResponse.success(res, result, 'Google Calendar connected');
    } catch (err: any) {
      // Surface Google's actual OAuth error (err.response.data) instead of the
      // raw circular Axios error, which is otherwise unloggable/uninformative.
      const googleError = err?.response?.data;
      Log.error('Google Calendar callback error', {
        message: err?.message,
        status: err?.response?.status,
        googleError,
      });
      const detail =
        googleError?.error_description || googleError?.error || err?.message || 'Failed to connect Google Calendar';
      return ApiResponse.error(res, detail);
    }
  }

  /** DELETE /google-calendar/disconnect */
  static async disconnect(req: Request, res: Response) {
    try {
      await GoogleCalendarService.disconnect(req.user.id);
      return ApiResponse.success(res, null, 'Google Calendar disconnected');
    } catch (err: any) {
      Log.error('Google Calendar disconnect error', err);
      return ApiResponse.error(res, 'Failed to disconnect Google Calendar');
    }
  }

  /** GET /google-calendar/status */
  static async getStatus(req: Request, res: Response) {
    try {
      const status = await GoogleCalendarService.getStatus(req.user.id);
      return ApiResponse.success(res, status, 'Calendar status');
    } catch (err: any) {
      Log.error('Google Calendar status error', err);
      return ApiResponse.error(res, 'Failed to get calendar status');
    }
  }
}
