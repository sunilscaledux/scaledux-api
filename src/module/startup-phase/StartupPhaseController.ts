import { Request, Response } from 'express';
import { ApiResponse } from '@utils/ApiResponse';
import { Log } from '@services/loggerService';
import { createAttachment } from '@services/attachmentService';
import type { AttachmentMetaItem } from '@middleware/fileupload';
import * as StartupPhaseService from './StartupPhaseService';

/** GET /startup-phases?industry_id= */
export async function listPhases(req: Request, res: Response) {
  try {
    const industryIdRaw = req.query.industry_id as string | undefined;
    const industryId = industryIdRaw ? parseInt(industryIdRaw, 10) : null;
    const result = await StartupPhaseService.listStartupPhases(
      industryId != null && !Number.isNaN(industryId) ? industryId : null
    );
    if (result.success) return ApiResponse.success(res, result.data, result.message);
    return ApiResponse.error(res, result.message, 400);
  } catch (e: any) {
    Log.error('listPhases error', { error: e });
    return ApiResponse.error(res, e?.message || 'Failed to list phases', 500);
  }
}

/** GET /profile/company/startup-progress */
export async function getProgress(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return ApiResponse.unauthorized(res, 'Authentication required');
    const result = await StartupPhaseService.getUserStartupProgress(userId);
    if (result.success) return ApiResponse.success(res, result.data, result.message);
    return ApiResponse.error(res, result.message, 400);
  } catch (e: any) {
    Log.error('getProgress error', { error: e });
    return ApiResponse.error(res, e?.message || 'Failed to get progress', 500);
  }
}

/** PATCH /profile/company/startup-progress/current-phase */
export async function setCurrentPhase(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return ApiResponse.unauthorized(res, 'Authentication required');
    const { phase_id } = req.body || {};
    const id = parseInt(String(phase_id), 10);
    const result = await StartupPhaseService.setCurrentPhase(userId, id);
    if (result.success) return ApiResponse.success(res, result.data, result.message);
    return ApiResponse.error(res, result.message, 400);
  } catch (e: any) {
    Log.error('setCurrentPhase error', { error: e });
    return ApiResponse.error(res, e?.message || 'Failed to set current phase', 500);
  }
}

/** POST /profile/company/startup-progress/activity */
export async function toggleActivity(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return ApiResponse.unauthorized(res, 'Authentication required');
    const { activity_id, completed } = req.body || {};
    const id = parseInt(String(activity_id), 10);
    const result = await StartupPhaseService.toggleActivity(userId, id, Boolean(completed));
    if (result.success) return ApiResponse.success(res, result.data, result.message);
    return ApiResponse.error(res, result.message, 400);
  } catch (e: any) {
    Log.error('toggleActivity error', { error: e });
    return ApiResponse.error(res, e?.message || 'Failed to toggle activity', 500);
  }
}

/**
 * POST /profile/company/startup-progress/deliverable/:id
 * Receives the uploaded file from FileUpload middleware (single file).
 */
export async function uploadDeliverable(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return ApiResponse.unauthorized(res, 'Authentication required');

    const deliverableId = parseInt(req.params.id, 10);
    if (!deliverableId || Number.isNaN(deliverableId)) {
      return ApiResponse.error(res, 'Valid deliverable id is required', 400);
    }

    const file = req.file as Express.Multer.File | undefined;
    const meta = (req as any).attachmentMeta as AttachmentMetaItem[] | undefined;
    if (!file || !meta?.length) {
      return ApiResponse.error(res, 'No file uploaded', 400);
    }

    const m = meta[0];
    const created = await createAttachment({
      ownerUserId: userId,
      uploadedByUserId: userId,
      path: m.path,
      disk: 'bunny',
      visibility: 'private',
      mimeType: m.mimeType,
      sizeBytes: file.size ?? m.size,
      originalName: m.originalName,
      status: 'temporary',
      existingUniqueId: m.uniqueId,
    });
    if (!created) {
      return ApiResponse.error(res, 'Failed to save attachment', 500);
    }

    const result = await StartupPhaseService.saveDeliverableFile(
      userId,
      deliverableId,
      created.unique_id,
      m.originalName,
      file.size ?? m.size
    );
    if (result.success) return ApiResponse.success(res, result.data, result.message);
    return ApiResponse.error(res, result.message, 400);
  } catch (e: any) {
    Log.error('uploadDeliverable error', { error: e });
    return ApiResponse.error(res, e?.message || 'Failed to upload deliverable', 500);
  }
}

/** DELETE /profile/company/startup-progress/deliverable/:id */
export async function deleteDeliverable(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return ApiResponse.unauthorized(res, 'Authentication required');

    const deliverableId = parseInt(req.params.id, 10);
    if (!deliverableId || Number.isNaN(deliverableId)) {
      return ApiResponse.error(res, 'Valid deliverable id is required', 400);
    }

    const result = await StartupPhaseService.deleteDeliverableFile(userId, deliverableId);
    if (result.success) return ApiResponse.success(res, null, result.message);
    return ApiResponse.error(res, result.message, 400);
  } catch (e: any) {
    Log.error('deleteDeliverable error', { error: e });
    return ApiResponse.error(res, e?.message || 'Failed to delete deliverable', 500);
  }
}
