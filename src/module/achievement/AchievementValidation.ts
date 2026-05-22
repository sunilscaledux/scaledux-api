import Joi from 'joi'
import { rejectAllHtml, noHtmlMessages, validateSafeUrl, safeUrlMessages } from '../../utils/validation'

export const createAchievementSchema = Joi.object({
  title: Joi.string().required().min(2).max(120).custom(rejectAllHtml).messages({
    'string.base': 'Achievement title must be a string',
    'string.empty': 'Achievement title is required',
    'string.min': 'Achievement title must be at least 2 characters long',
    'string.max': 'Achievement title must not exceed 120 characters',
    'any.required': 'Achievement title is required',
    ...noHtmlMessages,
  }),
  description: Joi.string().optional().allow('').max(1000).custom(rejectAllHtml).messages({
    'string.base': 'Description must be a string',
    'string.max': 'Description must not exceed 1000 characters',
    ...noHtmlMessages,
  }),
  company: Joi.string().required().min(2).max(150).custom(rejectAllHtml).messages({
    'string.base': 'Company/Organization must be a string',
    'string.empty': 'Company/Organization is required',
    'string.min': 'Company/Organization must be at least 2 characters long',
    'string.max': 'Company/Organization must not exceed 150 characters',
    'any.required': 'Company/Organization is required',
    ...noHtmlMessages,
  }),
  completed_month: Joi.string().required().messages({
    'string.base': 'Completion month must be a string',
    'string.empty': 'Completion month is required',
    'any.required': 'Completion month is required'
  }),
  completed_year: Joi.string().required().messages({
    'string.base': 'Completion year must be a string',
    'string.empty': 'Completion year is required',
    'any.required': 'Completion year is required'
  }),
  achievement_link: Joi.string().optional().allow('').max(2048).custom(validateSafeUrl).messages({
    'string.max': 'Achievement link must not exceed 2048 characters',
    ...safeUrlMessages,
  }),
  media_files: Joi.array().items(
    Joi.string().messages({
      'string.base': 'Media file must be a string (URL or path)'
    })
  ).optional().max(5).messages({
    'array.base': 'Media files must be an array',
    'array.max': 'Maximum 5 media files allowed'
  })
})

export const updateAchievementSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    'number.base': 'Achievement ID must be a number',
    'number.integer': 'Achievement ID must be an integer',
    'number.positive': 'Achievement ID must be positive',
    'any.required': 'Achievement ID is required'
  }),
  title: Joi.string().required().min(2).max(120).custom(rejectAllHtml).messages({
    'string.base': 'Achievement title must be a string',
    'string.empty': 'Achievement title is required',
    'string.min': 'Achievement title must be at least 2 characters long',
    'string.max': 'Achievement title must not exceed 120 characters',
    'any.required': 'Achievement title is required',
    ...noHtmlMessages,
  }),
  description: Joi.string().optional().allow('').max(1000).custom(rejectAllHtml).messages({
    'string.base': 'Description must be a string',
    'string.max': 'Description must not exceed 1000 characters',
    ...noHtmlMessages,
  }),
  company: Joi.string().required().min(2).max(150).custom(rejectAllHtml).messages({
    'string.base': 'Company/Organization must be a string',
    'string.empty': 'Company/Organization is required',
    'string.min': 'Company/Organization must be at least 2 characters long',
    'string.max': 'Company/Organization must not exceed 150 characters',
    'any.required': 'Company/Organization is required',
    ...noHtmlMessages,
  }),
  completed_month: Joi.string().required().messages({
    'string.base': 'Completion month must be a string',
    'string.empty': 'Completion month is required',
    'any.required': 'Completion month is required'
  }),
  completed_year: Joi.string().required().messages({
    'string.base': 'Completion year must be a string',
    'string.empty': 'Completion year is required',
    'any.required': 'Completion year is required'
  }),
  achievement_link: Joi.string().optional().allow('').max(2048).custom(validateSafeUrl).messages({
    'string.max': 'Achievement link must not exceed 2048 characters',
    ...safeUrlMessages,
  }),
  media_files: Joi.array().items(
    Joi.string().messages({
      'string.base': 'Media file must be a string (URL or path)'
    })
  ).optional().max(5).messages({
    'array.base': 'Media files must be an array',
    'array.max': 'Maximum 5 media files allowed'
  })
})
