import { Request, Response } from 'express';
import { ApiResponse } from '@utils/ApiResponse';
import { auditFromReq } from '@admin/services/auditService';
import { NotificationService } from './NotificationService';

export async function previewAudience(req: Request, res: Response) {
  const result = await NotificationService.previewAudience(req.body || {});
  if (!result.success) return ApiResponse.error(res, result.message, null, result.statusCode ?? 400);
  return ApiResponse.success(res, result.data, result.message);
}

export async function sendAnnouncement(req: Request, res: Response) {
  const { title, target, role } = req.body || {};
  const result = await NotificationService.sendAnnouncement(req.body || {});
  if (!result.success) return ApiResponse.error(res, result.message, null, result.statusCode ?? 400);
  await auditFromReq(req, 'notification.broadcast', {
    entityType: 'Notification',
    description: title,
    metadata: { target, role, recipients: result.data.recipients },
  });
  return ApiResponse.success(res, result.data, result.message);
}
