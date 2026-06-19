import { Request, Response } from 'express';
import { getByUniqueId } from '@services/attachmentService';
import { getPrivateFileAndSend, getPublicUrl } from '@services/bunnyStorageService';
import { ApiResponse } from '@utils/ApiResponse';

/**
 * Stream a stored file to an authenticated admin. Admins can access ALL private
 * files — there is no per-user access check (intentional). Public files redirect
 * to their CDN URL; private files are streamed from the Bunny private zone.
 */
export async function viewFile(req: Request, res: Response) {
  const { uniqueId } = req.params;
  const att = await getByUniqueId(uniqueId);
  if (!att) return ApiResponse.notFound(res, 'File not found');

  if (att.visibility === 'public') {
    res.setHeader('Cache-Control', 'private, max-age=300');
    return res.redirect(getPublicUrl(att.path));
  }

  const sent = await getPrivateFileAndSend(att.path, () => Promise.resolve(true), res);
  if (!sent && !res.headersSent) return ApiResponse.notFound(res, 'File unavailable');
}
