import { Request, Response } from 'express'
import { SuccessStoryService } from './SuccessStoryService'
import { getIntParam } from '@utils/requestHelpers'
import { createSuccessStorySchema, updateSuccessStorySchema } from './SuccessStoryValidation'
import { CreateSuccessStoryInput, UpdateSuccessStoryInput } from './SuccessStoryType'

export const getSuccessStories = async (req: Request, res: Response) => {
  const userId = req.user?.id
  if (!userId) {
    return res.status(401).json({ success: false, message: 'User not authenticated' })
  }

  const result = await SuccessStoryService.getSuccessStories(userId)
  return res.status(result.success ? 200 : 500).json({
    success: result.success,
    message: result.message,
    data: result.data
  })
}

export const createSuccessStory = async (req: Request, res: Response) => {
  const userId = req.user?.id
  if (!userId) {
    return res.status(401).json({ success: false, message: 'User not authenticated' })
  }

  const { error, value } = createSuccessStorySchema.validate(req.body)
  if (error) {
    return res.status(400).json({ success: false, message: error.details[0].message })
  }

  const data: CreateSuccessStoryInput = value
  const result = await SuccessStoryService.createSuccessStory(userId, data)
  return res.status(result.success ? 201 : 500).json({
    success: result.success,
    message: result.message,
    data: result.data
  })
}

export const updateSuccessStory = async (req: Request, res: Response) => {
  const userId = req.user?.id
  if (!userId) {
    return res.status(401).json({ success: false, message: 'User not authenticated' })
  }

  const { error, value } = updateSuccessStorySchema.validate(req.body)
  if (error) {
    return res.status(400).json({ success: false, message: error.details[0].message })
  }

  const data: UpdateSuccessStoryInput = value
  const result = await SuccessStoryService.updateSuccessStory(userId, data)
  const statusCode = result.success ? 200 : (result.message === 'Success story not found' ? 404 : 500)
  return res.status(statusCode).json({
    success: result.success,
    message: result.message,
    data: result.data
  })
}

export const deleteSuccessStory = async (req: Request, res: Response) => {
  const userId = req.user?.id
  const storyId = getIntParam(req.params.id)

  if (!userId) {
    return res.status(401).json({ success: false, message: 'User not authenticated' })
  }

  if (!storyId || isNaN(storyId)) {
    return res.status(400).json({ success: false, message: 'Valid story ID is required' })
  }

  const result = await SuccessStoryService.deleteSuccessStory(userId, storyId)
  const statusCode = result.success ? 200 : (result.message === 'Success story not found' ? 404 : 500)
  return res.status(statusCode).json({
    success: result.success,
    message: result.message,
    data: result.data
  })
}
