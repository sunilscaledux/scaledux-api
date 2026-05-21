import { Request, Response } from 'express'
import { ApiResponse } from '@utils/ApiResponse'
import { deletePublic, getPublicUrl } from '@services/bunnyStorageService'
import { Log } from '@services/loggerService'
import { viewProtectedFile as viewProtectedFileService, getByUniqueId, createAttachment, resolveAttachmentUrl, urlOrPathToAttachmentId } from '@services/attachmentService'
import { prisma } from '@services/prismaService'
import type { AttachmentMetaItem } from '@middleware/fileupload'

/**
 * Unified file upload and deletion controller for all modules
 * Provides secure file upload/deletion with user ownership verification
 */

export async function uploadFile(req: Request, res: Response) {
  const userId = req.user?.id
  const userUniqueId = req.user?.unique_id

  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401)
  }

  const files = Array.isArray(req.files) ? req.files : (req.file ? [req.file] : [])
  if (!files.length) {
    return ApiResponse.error(res, "No files uploaded", 400)
  }

  const meta = (req as any).attachmentMeta as AttachmentMetaItem[] | undefined
  if (meta?.length) {
    const disk = 'bunny'
    const visibility = (req as any).uploadVisibility as 'public' | 'private' | undefined ?? 'private'
    const fieldName = (req as any).uploadFieldName as string | undefined ?? 'attachment'
    const filesList = files as Express.Multer.File[]
    const uniqueIds: string[] = []
    const urls: string[] = []
    for (let i = 0; i < meta.length; i++) {
      const m = meta[i]
      const file = filesList[i]
      const size = file?.size ?? m.size
      const created = await createAttachment({
        ownerUserId: userId,
        uploadedByUserId: userId,
        path: m.path,
        disk,
        visibility,
        mimeType: m.mimeType,
        sizeBytes: size,
        originalName: m.originalName,
        status: 'temporary',
        existingUniqueId: m.uniqueId,
      })
      if (created) {
        uniqueIds.push(created.unique_id)
        const url = await resolveAttachmentUrl(created.unique_id, fieldName)
        urls.push(url)
      }
    }
    return ApiResponse.success(res, { urls }, "Files uploaded successfully")
  }

  const urls = (files as any[]).map((file: any) => {
    const relativePath = file.path ?? ''
    return relativePath ? getPublicUrl(relativePath) : ''
  }).filter(Boolean)

  return ApiResponse.success(res, { urls }, "Files uploaded successfully")
}

export async function deleteFile(req: Request, res: Response) {
  const userId = req.user?.id
  const userUniqueId = req.user?.unique_id
  const { filePath } = req.body

  Log.info("Unified delete request:", { userId, userUniqueId, filePath, body: req.body })

  // Validate authentication
  if (!userId || !userUniqueId) {
    return ApiResponse.error(res, "User not authenticated", 401)
  }

  const rawIdOrUrl = (req.body as any).uniqueId ?? filePath
  if (!rawIdOrUrl) {
    return ApiResponse.error(res, "uniqueId is required", 400)
  }
  const uniqueId = urlOrPathToAttachmentId(rawIdOrUrl)
  if (!uniqueId) {
    return ApiResponse.error(res, "Invalid attachment id", 400)
  }

  const att = await getByUniqueId(uniqueId)
  if (!att) return ApiResponse.error(res, "File not found", 404)
  if (att.owner_user_id !== userId) return ApiResponse.error(res, "Unauthorized: You can only delete your own files", 403)
  const pathToDelete = att.path
  await (prisma as any).attachment.update({
    where: { id: att.id },
    data: { deleted_at: new Date() }
  })

  const deleted = await deletePublic(pathToDelete)
  if (!deleted) Log.info("Bunny delete returned false for:", pathToDelete)

  return ApiResponse.success(res, {
    message: "File deleted successfully",
    filePath: pathToDelete
  }, "File deleted successfully")
}

import { appConfig } from '@config/app';
const fileLostUrl = () => `${appConfig.frontendUrl}/file-lost`

export async function viewProtectedFile(req: Request, res: Response) {
  try {
    const uniqueId = req.params.uniqueId as string
    const userId = req.user?.id

    if (!uniqueId) {
      return res.redirect(302, fileLostUrl())
    }

    // Look up attachment (including soft-deleted to give proper error)
    const att = await getByUniqueId(uniqueId)
    if (!att) {
      // Check if it exists but is soft-deleted
      const deleted = await (prisma as any).attachment.findUnique({ where: { unique_id: uniqueId } })
      if (deleted?.deleted_at) {
        Log.info(`[viewFile] File ${uniqueId} is soft-deleted. deleted_at=${deleted.deleted_at}`)
        return res.status(410).json({ error: 'File has been deleted' })
      }
      Log.info(`[viewFile] File ${uniqueId} not found in DB`)
      return res.redirect(302, fileLostUrl())
    }

    if (!userId) {
      Log.info(`[viewFile] No userId for file ${uniqueId}`)
      return res.redirect(302, fileLostUrl())
    }

    const isOwner = att.owner_user_id === userId
    const ids = att.accessible_user_ids as number[] | null | undefined
    let hasAccess = isOwner || (Array.isArray(ids) && ids.includes(userId))

    // Investors can access startup deliverable files
    if (!hasAccess && att.path?.startsWith('startup-deliverables/')) {
      const viewer = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
      if (viewer?.role === 'investor') {
        hasAccess = true
      }
    }

    if (!hasAccess) {
      Log.info(`[viewFile] Access denied for file ${uniqueId}. userId=${userId}, owner=${att.owner_user_id}, accessible=${JSON.stringify(ids)}`)
      return res.status(403).json({ error: 'Access denied' })
    }

    const sent = await viewProtectedFileService(uniqueId, () => Promise.resolve(true), res)
    if (!sent) {
      Log.info(`[viewFile] Bunny CDN failed to stream file ${uniqueId}, path=${att.path}`)
      return res.status(404).json({ error: 'File not found on storage' })
    }
  } catch (error: any) {
    Log.error("Error in viewProtectedFile", { error })
    return res.redirect(302, fileLostUrl())
  }
}
