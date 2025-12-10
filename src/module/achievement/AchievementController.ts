import { Request, Response } from 'express'
import { prisma } from '../../services/prismaService'
import { createAchievementSchema, updateAchievementSchema } from './AchievementValidation'
import { CreateAchievementInput, UpdateAchievementInput, MediaFile } from './AchievementType'

// Helper function to get relative path (same as in ProfileController)
const getRelativePath = (fullPath: string): string => {
  const uploadsIndex = fullPath.indexOf('uploads')
  if (uploadsIndex !== -1) {
    return fullPath.substring(uploadsIndex)
  }
  return fullPath
}

// Get all achievements for a user
export const getAchievements = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      })
    }

    const achievements = await prisma.achievement.findMany({
      where: {
        user_id: userId
      },
      orderBy: [
        { completed_year: 'desc' },
        { completed_month: 'desc' },
        { created_at: 'desc' }
      ]
    })

    return res.status(200).json({
      success: true,
      message: 'Achievements retrieved successfully',
      data: achievements
    })
  } catch (error) {
    console.error('Error fetching achievements:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
}

// Create a new achievement
export const createAchievement = async (req: Request, res: Response) => {
  try {
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

    const achievement = await prisma.achievement.create({
      data: {
        user_id: userId,
        title: achievementData.title,
        description: achievementData.description || undefined,
        company: achievementData.company,
        completed_month: achievementData.completed_month,
        completed_year: achievementData.completed_year,
        achievement_link: achievementData.achievement_link || undefined,
        media_files: achievementData.media_files ? JSON.parse(JSON.stringify(achievementData.media_files)) : undefined
      }
    })

    return res.status(201).json({
      success: true,
      message: 'Achievement created successfully',
      data: achievement
    })
  } catch (error) {
    console.error('Error creating achievement:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
}

// Update an achievement
export const updateAchievement = async (req: Request, res: Response) => {
  try {
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

    // Check if achievement exists and belongs to the user
    const existingAchievement = await prisma.achievement.findFirst({
      where: {
        id: achievementData.id,
        user_id: userId
      }
    })

    if (!existingAchievement) {
      return res.status(404).json({
        success: false,
        message: 'Achievement not found'
      })
    }

    const updatedAchievement = await prisma.achievement.update({
      where: {
        id: achievementData.id
      },
      data: {
        title: achievementData.title,
        description: achievementData.description || undefined,
        company: achievementData.company,
        completed_month: achievementData.completed_month,
        completed_year: achievementData.completed_year,
        achievement_link: achievementData.achievement_link || undefined,
        media_files: achievementData.media_files ? JSON.parse(JSON.stringify(achievementData.media_files)) : undefined
      }
    })

    return res.status(200).json({
      success: true,
      message: 'Achievement updated successfully',
      data: updatedAchievement
    })
  } catch (error) {
    console.error('Error updating achievement:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
}

// Delete an achievement
export const deleteAchievement = async (req: Request, res: Response) => {
  try {
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

    // Check if achievement exists and belongs to the user
    const existingAchievement = await prisma.achievement.findFirst({
      where: {
        id: achievementId,
        user_id: userId
      }
    })

    if (!existingAchievement) {
      return res.status(404).json({
        success: false,
        message: 'Achievement not found'
      })
    }

    await prisma.achievement.delete({
      where: {
        id: achievementId
      }
    })

    return res.status(200).json({
      success: true,
      message: 'Achievement deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting achievement:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
}

// Upload achievement media files using Multer
export const uploadAchievementMedia = async (req: Request, res: Response) => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      })
    }

    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      })
    }

    // Process uploaded files
    const mediaFiles: MediaFile[] = req.files.map((file: Express.Multer.File) => {
      const relativePath = getRelativePath(file.path)
      
      return {
        url: `/${relativePath.replace(/\\/g, '/')}`, // Ensure forward slashes for URLs
        name: file.originalname,
        type: file.mimetype.startsWith('image/') ? 'image' : 'document',
        size: file.size,
        mimeType: file.mimetype
      }
    })

    return res.status(200).json({
      success: true,
      message: 'Media files uploaded successfully',
      data: {
        mediaFiles,
        count: mediaFiles.length
      }
    })
  } catch (error) {
    console.error('Error uploading achievement media:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
}
