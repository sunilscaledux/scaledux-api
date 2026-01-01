import Joi from 'joi'

export const createAchievementSchema = Joi.object({
  title: Joi.string().required().min(2).max(255).messages({
    'string.base': 'Achievement title must be a string',
    'string.empty': 'Achievement title is required',
    'string.min': 'Achievement title must be at least 2 characters long',
    'string.max': 'Achievement title must not exceed 255 characters',
    'any.required': 'Achievement title is required'
  }),
  description: Joi.string().optional().allow('').max(1000).messages({
    'string.base': 'Description must be a string',
    'string.max': 'Description must not exceed 1000 characters'
  }),
  company: Joi.string().required().min(2).max(255).messages({
    'string.base': 'Company/Organization must be a string',
    'string.empty': 'Company/Organization is required',
    'string.min': 'Company/Organization must be at least 2 characters long',
    'string.max': 'Company/Organization must not exceed 255 characters',
    'any.required': 'Company/Organization is required'
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
  achievement_link: Joi.string().optional().allow(''),
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
  title: Joi.string().required().min(2).max(255).messages({
    'string.base': 'Achievement title must be a string',
    'string.empty': 'Achievement title is required',
    'string.min': 'Achievement title must be at least 2 characters long',
    'string.max': 'Achievement title must not exceed 255 characters',
    'any.required': 'Achievement title is required'
  }),
  description: Joi.string().optional().allow('').max(1000).messages({
    'string.base': 'Description must be a string',
    'string.max': 'Description must not exceed 1000 characters'
  }),
  company: Joi.string().required().min(2).max(255).messages({
    'string.base': 'Company/Organization must be a string',
    'string.empty': 'Company/Organization is required',
    'string.min': 'Company/Organization must be at least 2 characters long',
    'string.max': 'Company/Organization must not exceed 255 characters',
    'any.required': 'Company/Organization is required'
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
  achievement_link: Joi.string().optional().allow('').custom((value, helpers) => {
    if (!value || value.trim() === '') {
      return value;
    }
    
    let url = value.trim();
    
    // Reject if user sends URL with protocol (frontend should strip it)
    if (url.match(/^https?:\/\//i)) {
      return helpers.error('string.protocol');
    }
    
    // Validate the URL by adding protocol temporarily
    try {
      new URL(`https://${url}`);
      return url; // Store without protocol
    } catch (error) {
      return helpers.error('string.uri');
    }
  }).messages({
    'string.base': 'Achievement link must be a string',
    'string.uri': 'Achievement link must be a valid URL',
    'string.protocol': 'Achievement link should not include http:// or https://'
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
