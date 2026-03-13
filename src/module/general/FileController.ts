import { Request, Response } from 'express'
import { ApiResponse } from '@utils/ApiResponse'
import { extractRelativePath, getRelativePath, getFileUrl } from '@utils/General'
import { deletePublic } from '@services/bunnyStorageService'
import fileConfig from '@config/file'
import fs from 'fs'
import path from 'path'
import { Log } from '@services/loggerService';

/**
 * Unified file upload and deletion controller for all modules
 * Provides secure file upload/deletion with user ownership verification
 */

export async function uploadFile(req: Request, res: Response) {
  try {
    const userId = req.user?.id
    const userUniqueId = req.user?.unique_id

    if (!userId) {
      return ApiResponse.error(res, "User not authenticated", 401)
    }

    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return ApiResponse.error(res, "No files uploaded", 400)
    }

    // Process uploaded files (file.path is set by multer: local path or Bunny storage path)
    const uploadedFiles = req.files.map((file: any) => {
      const relativePath = file.path ? (fileConfig.isBunny ? file.path : getRelativePath(file.path)) : ''
      const url = getFileUrl(relativePath)
      return {
        path: relativePath,
        url: url,
        name: file.originalname,
        size: file.size,
        mimetype: file.mimetype
      }
    })

    // Always return arrays for consistency
    return ApiResponse.success(res, {
      paths: uploadedFiles.map(f => f.path),
      urls: uploadedFiles.map(f => f.url),
      files: uploadedFiles
    }, "Files uploaded successfully")

  } catch (error: any) {
    Log.error("Error", { error })
    return ApiResponse.error(res, "Failed to upload files", 500)
  }
}

export async function deleteFile(req: Request, res: Response) {
  try {
    const userId = req.user?.id
    const userUniqueId = req.user?.unique_id
    const { filePath } = req.body

    Log.info("Unified delete request:", { userId, userUniqueId, filePath, body: req.body })

    // Validate authentication
    if (!userId || !userUniqueId) {
      return ApiResponse.error(res, "User not authenticated", 401)
    }

    // Validate file path
    if (!filePath) {
      return ApiResponse.error(res, "File path is required", 400)
    }

    // Extract relative path from the full URL/path
    const relativePath = extractRelativePath(filePath)
    
    // File paths should contain the user's unique_id (e.g., uploads/USER_UNIQUE_ID/...)
    if (!relativePath.includes(userUniqueId)) {
      Log.info("Security violation: File path doesn't contain user unique_id", {
        relativePath,
        userUniqueId,
        filePath
      })
      return ApiResponse.error(res, "Unauthorized: You can only delete your own files", 403)
    }

    if (fileConfig.isBunny) {
      const deleted = await deletePublic(relativePath)
      if (!deleted) Log.info("Bunny delete returned false for:", relativePath)
    } else {
      const fullPath = path.join(process.cwd(), relativePath)
      Log.info("File deletion paths:", { relativePath, fullPath, exists: fs.existsSync(fullPath) })
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath)
        Log.info("File deleted successfully:", fullPath)
      } else {
        Log.info("File not found, but returning success:", fullPath)
      }
    }

    return ApiResponse.success(res, {
      message: "File deleted successfully",
      filePath: relativePath
    }, "File deleted successfully")

  } catch (error: any) {
    Log.error("Error", { error })
    return ApiResponse.error(res, "Failed to delete file", 500)
  }
}
