import { Request, Response } from 'express'
import { WorkExperienceService } from './WorkExperienceService'
import { createWorkExperienceSchema, updateWorkExperienceSchema } from './WorkExperienceValidation'
import { CreateWorkExperienceInput, UpdateWorkExperienceInput } from './WorkExperienceType'
import { getIntParam } from '@utils/requestHelpers'

export const getWorkExperiences = async (req: Request, res: Response) => {
  const userId = req.user?.id

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'User not authenticated'
    })
  }

  const result = await WorkExperienceService.getWorkExperiences(userId)

  return res.status(result.success ? 200 : 500).json({
    success: result.success,
    message: result.message,
    data: result.data
  })
}

export const createWorkExperience = async (req: Request, res: Response) => {
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
  const result = await WorkExperienceService.createWorkExperience(userId, workExperienceData)

  return res.status(result.success ? 201 : 500).json({
    success: result.success,
    message: result.message,
    data: result.data
  })
}

export const updateWorkExperience = async (req: Request, res: Response) => {
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
  const result = await WorkExperienceService.updateWorkExperience(userId, workExperienceData)

  const statusCode = result.success ? 200 : (result.message === 'Work experience not found' ? 404 : 500)
  return res.status(statusCode).json({
    success: result.success,
    message: result.message,
    data: result.data
  })
}

export const deleteWorkExperience = async (req: Request, res: Response) => {
  const userId = req.user?.id
  const workExperienceId = getIntParam(req.params.id)

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

  const result = await WorkExperienceService.deleteWorkExperience(userId, workExperienceId)

  const statusCode = result.success ? 200 : (result.message === 'Work experience not found' ? 404 : 500)
  return res.status(statusCode).json({
    success: result.success,
    message: result.message,
    data: result.data
  })
}
