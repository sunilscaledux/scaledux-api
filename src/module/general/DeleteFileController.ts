import { Request, Response } from 'express'
import { ApiResponse } from '@utils/ApiResponse'
import { extractRelativePath } from '@utils/General'
import fs from 'fs'
import path from 'path'

/**
 * Unified file deletion controller for all modules
 * Provides secure file deletion with user ownership verification
 */
export async function deleteFile(req: Request, res: Response) {
  try {
    const userId = req.user?.id
    const userUniqueId = req.user?.unique_id
    const { filePath } = req.body

    console.log("Unified delete request:", { userId, userUniqueId, filePath, body: req.body })

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
    
    // Security check: Verify the file belongs to the authenticated user
    // File paths should contain the user's unique_id (e.g., uploads/USER_UNIQUE_ID/...)
    if (!relativePath.includes(userUniqueId)) {
      console.log("Security violation: File path doesn't contain user unique_id", {
        relativePath,
        userUniqueId,
        filePath
      })
      return ApiResponse.error(res, "Unauthorized: You can only delete your own files", 403)
    }

    // Construct full file system path
    const fullPath = path.join(process.cwd(), relativePath)
    
    console.log("File deletion paths:", {
      relativePath,
      fullPath,
      exists: fs.existsSync(fullPath)
    })

    // Check if file exists and delete it
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath)
      console.log("File deleted successfully:", fullPath)
    } else {
      console.log("File not found, but returning success:", fullPath)
    }

    return ApiResponse.success(res, {
      message: "File deleted successfully",
      filePath: relativePath
    }, "File deleted successfully")

  } catch (error: any) {
    console.error("Delete File Error:", error)
    return ApiResponse.error(res, "Failed to delete file", 500)
  }
}
