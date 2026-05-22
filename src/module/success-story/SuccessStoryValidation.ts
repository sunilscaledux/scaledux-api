import Joi from 'joi'
import { rejectDangerousHtml, dangerousHtmlMessages } from '../../utils/validation'

export const createSuccessStorySchema = Joi.object({
  title: Joi.string().required().min(2).max(255).messages({
    'string.base': 'Story title must be a string',
    'string.empty': 'Story title is required',
    'string.min': 'Story title must be at least 2 characters long',
    'string.max': 'Story title must not exceed 255 characters',
    'any.required': 'Story title is required'
  }),
  description: Joi.string().optional().allow('').max(900).custom(rejectDangerousHtml).messages({
    'string.base': 'Description must be a string',
    'string.max': 'Description must not exceed 900 characters',
    ...dangerousHtmlMessages,
  }),
  date: Joi.string().optional().allow('').isoDate().messages({
    'string.base': 'Date must be a string',
    'string.isoDate': 'Date must be a valid ISO date'
  }),
  organisation_name: Joi.string().required().min(2).max(255).messages({
    'string.base': 'Organisation name must be a string',
    'string.empty': 'Organisation name is required',
    'string.min': 'Organisation name must be at least 2 characters long',
    'string.max': 'Organisation name must not exceed 255 characters',
    'any.required': 'Organisation name is required'
  }),
  client_name: Joi.string().optional().allow('').max(255).messages({
    'string.base': 'Client name must be a string',
    'string.max': 'Client name must not exceed 255 characters'
  }),
  linkedin_link: Joi.string().optional().allow('').max(500).messages({
    'string.base': 'LinkedIn link must be a string',
    'string.max': 'LinkedIn link must not exceed 500 characters'
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

export const updateSuccessStorySchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    'number.base': 'Story ID must be a number',
    'number.integer': 'Story ID must be an integer',
    'number.positive': 'Story ID must be positive',
    'any.required': 'Story ID is required'
  }),
  title: Joi.string().required().min(2).max(255).messages({
    'string.base': 'Story title must be a string',
    'string.empty': 'Story title is required',
    'string.min': 'Story title must be at least 2 characters long',
    'string.max': 'Story title must not exceed 255 characters',
    'any.required': 'Story title is required'
  }),
  description: Joi.string().optional().allow('').max(900).custom(rejectDangerousHtml).messages({
    'string.base': 'Description must be a string',
    'string.max': 'Description must not exceed 900 characters',
    ...dangerousHtmlMessages,
  }),
  date: Joi.string().optional().allow('').isoDate().messages({
    'string.base': 'Date must be a string',
    'string.isoDate': 'Date must be a valid ISO date'
  }),
  organisation_name: Joi.string().required().min(2).max(255).messages({
    'string.base': 'Organisation name must be a string',
    'string.empty': 'Organisation name is required',
    'string.min': 'Organisation name must be at least 2 characters long',
    'string.max': 'Organisation name must not exceed 255 characters',
    'any.required': 'Organisation name is required'
  }),
  client_name: Joi.string().optional().allow('').max(255).messages({
    'string.base': 'Client name must be a string',
    'string.max': 'Client name must not exceed 255 characters'
  }),
  linkedin_link: Joi.string().optional().allow('').max(500).messages({
    'string.base': 'LinkedIn link must be a string',
    'string.max': 'LinkedIn link must not exceed 500 characters'
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
