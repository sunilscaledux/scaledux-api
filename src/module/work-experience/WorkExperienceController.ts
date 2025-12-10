import { Request, Response } from 'express'
import { prisma } from '../../services/prismaService'
import { createWorkExperienceSchema, updateWorkExperienceSchema } from './WorkExperienceValidation'
import { CreateWorkExperienceInput, UpdateWorkExperienceInput } from './WorkExperienceType'

export const getWorkExperiences = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      })
    }

    const workExperiences = await prisma.workExperience.findMany({
      where: {
        user_id: userId
      },
      orderBy: {
        created_at: 'desc'
      }
    })

    return res.status(200).json({
      success: true,
      message: 'Work experiences retrieved successfully',
      data: workExperiences
    })
  } catch (error) {
    console.error('Error fetching work experiences:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
}

export const createWorkExperience = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      })
    }

    // Validate request body
    const { error, value } = createWorkExperienceSchema.validate(req.body)
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      })
    }

    const workExperienceData: CreateWorkExperienceInput = value

    // If is_current is true, clear end_month and end_year
    if (workExperienceData.is_current) {
      workExperienceData.end_month = undefined
      workExperienceData.end_year = undefined
    }

    const workExperience = await prisma.workExperience.create({
      data: {
        user_id: userId,
        role: workExperienceData.role,
        company: workExperienceData.company,
        company_website: workExperienceData.company_website || null,
        description: workExperienceData.description || null,
        start_month: workExperienceData.start_month,
        start_year: workExperienceData.start_year,
        end_month: workExperienceData.end_month || null,
        end_year: workExperienceData.end_year || null,
        is_current: workExperienceData.is_current
      }
    })

    return res.status(201).json({
      success: true,
      message: 'Work experience created successfully',
      data: workExperience
    })
  } catch (error) {
    console.error('Error creating work experience:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
}

export const updateWorkExperience = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      })
    }

    // Validate request body
    const { error, value } = updateWorkExperienceSchema.validate(req.body)
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      })
    }

    const workExperienceData: UpdateWorkExperienceInput = value

    // Check if work experience exists and belongs to user
    const existingWorkExperience = await prisma.workExperience.findFirst({
      where: {
        id: workExperienceData.id,
        user_id: userId
      }
    })

    if (!existingWorkExperience) {
      return res.status(404).json({
        success: false,
        message: 'Work experience not found'
      })
    }

    // If is_current is true, clear end_month and end_year
    if (workExperienceData.is_current) {
      workExperienceData.end_month = undefined
      workExperienceData.end_year = undefined
    }

    const updatedWorkExperience = await prisma.workExperience.update({
      where: {
        id: workExperienceData.id
      },
      data: {
        role: workExperienceData.role,
        company: workExperienceData.company,
        company_website: workExperienceData.company_website || null,
        description: workExperienceData.description || null,
        start_month: workExperienceData.start_month,
        start_year: workExperienceData.start_year,
        end_month: workExperienceData.end_month || null,
        end_year: workExperienceData.end_year || null,
        is_current: workExperienceData.is_current
      }
    })

    return res.status(200).json({
      success: true,
      message: 'Work experience updated successfully',
      data: updatedWorkExperience
    })
  } catch (error) {
    console.error('Error updating work experience:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
}

export const deleteWorkExperience = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id
    const workExperienceId = parseInt(req.params.id)

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      })
    }

    if (!workExperienceId || isNaN(workExperienceId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid work experience ID'
      })
    }

    // Check if work experience exists and belongs to user
    const existingWorkExperience = await prisma.workExperience.findFirst({
      where: {
        id: workExperienceId,
        user_id: userId
      }
    })

    if (!existingWorkExperience) {
      return res.status(404).json({
        success: false,
        message: 'Work experience not found'
      })
    }

    await prisma.workExperience.delete({
      where: {
        id: workExperienceId
      }
    })

    return res.status(200).json({
      success: true,
      message: 'Work experience deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting work experience:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
}
