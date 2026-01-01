import { Request, Response } from 'express'
import { AchievementService } from './AchievementService'
import { createAchievementSchema, updateAchievementSchema } from './AchievementValidation'
import { CreateAchievementInput, UpdateAchievementInput, MediaFile } from './AchievementType'
import { ApiResponse } from '@utils/ApiResponse'
import { getFileUrl, getRelativePath } from '@utils/General'

// Get all achievements for a user
export const getAchievements = async (req: Request, res: Response) => {
  const userId = req.user?.id

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'User not authenticated'
    })
  }

  const result = await AchievementService.getAchievements(userId)

  return res.status(result.success ? 200 : 500).json({
    success: result.success,
    message: result.message,
    data: result.data
  })
}

// Create a new achievement
export const createAchievement = async (req: Request, res: Response) => {
  const userId = req.user?.id

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'User not authenticated'
    })
  }

  const { error, value } = createAchievementSchema.validate(req.body)

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    })
  }

  const achievementData: CreateAchievementInput = value
  const result = await AchievementService.createAchievement(userId, achievementData)

  return res.status(result.success ? 201 : 500).json({
    success: result.success,
    message: result.message,
    data: result.data
  })
}

// Update an achievement
export const updateAchievement = async (req: Request, res: Response) => {
  const userId = req.user?.id

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'User not authenticated'
    })
  }

  const { error, value } = updateAchievementSchema.validate(req.body)

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    })
  }

  const achievementData: UpdateAchievementInput = value
  const result = await AchievementService.updateAchievement(userId, achievementData)

  const statusCode = result.success ? 200 : (result.message === 'Achievement not found' ? 404 : 500)
  return res.status(statusCode).json({
    success: result.success,
    message: result.message,
    data: result.data
  })
}

// Delete an achievement
export const deleteAchievement = async (req: Request, res: Response) => {
  const userId = req.user?.id
  const achievementId = parseInt(req.params.id)

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'User not authenticated'
    })
  }

  if (!achievementId || isNaN(achievementId)) {
    return res.status(400).json({
      success: false,
      message: 'Valid achievement ID is required'
    })
  }

  const result = await AchievementService.deleteAchievement(userId, achievementId)

  const statusCode = result.success ? 200 : (result.message === 'Achievement not found' ? 404 : 500)
  return res.status(statusCode).json({
    success: result.success,
    message: result.message,
    data: result.data
  })
}

// Upload achievement media files using Multer
export const uploadAchievementMedia = async (req: Request, res: Response) => {
  const userId = req.user?.id
  
  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401)
  }

  if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
    return ApiResponse.error(res, "No files uploaded", 400)
  }

  const mediaPaths = req.files.map((file: any) => getRelativePath(file.path))
  const mediaUrls = mediaPaths.map((path: string) => getFileUrl(path))

  return ApiResponse.success(res, {
    mediaPaths,
    mediaUrls,
  }, "Media files uploaded successfully")
}
