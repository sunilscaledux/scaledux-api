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
  achievement_link: Joi.string().optional().allow('').custom((value, helpers) => {
    if (!value || value.trim() === '') {
      return value;
    }
    
    // Add https:// if no protocol is provided
    let url = value.trim();
    if (!url.match(/^https?:\/\//i)) {
      url = `https://${url}`;
    }
    
    // Validate the URL
    try {
      new URL(url);
      return url;
    } catch (error) {
      return helpers.error('string.uri');
    }
  }).messages({
    'string.base': 'Achievement link must be a string',
    'string.uri': 'Achievement link must be a valid URL'
  }),
  media_files: Joi.array().items(
    Joi.object({
      url: Joi.string().uri().required().messages({
        'string.base': 'Media file URL must be a string',
        'string.uri': 'Media file URL must be a valid URL',
        'any.required': 'Media file URL is required'
      }),
      name: Joi.string().required().messages({
        'string.base': 'Media file name must be a string',
        'any.required': 'Media file name is required'
      }),
      type: Joi.string().valid('image', 'document').required().messages({
        'string.base': 'Media file type must be a string',
        'any.only': 'Media file type must be either "image" or "document"',
        'any.required': 'Media file type is required'
      }),
      size: Joi.number().optional().messages({
        'number.base': 'Media file size must be a number'
      }),
      mimeType: Joi.string().optional().messages({
        'string.base': 'Media file MIME type must be a string'
      })
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
    
    // Add https:// if no protocol is provided
    let url = value.trim();
    if (!url.match(/^https?:\/\//i)) {
      url = `https://${url}`;
    }
    
    // Validate the URL
    try {
      new URL(url);
      return url;
    } catch (error) {
      return helpers.error('string.uri');
    }
  }).messages({
    'string.base': 'Achievement link must be a string',
    'string.uri': 'Achievement link must be a valid URL'
  }),
  media_files: Joi.array().items(
    Joi.object({
      url: Joi.string().uri().required().messages({
        'string.base': 'Media file URL must be a string',
        'string.uri': 'Media file URL must be a valid URL',
        'any.required': 'Media file URL is required'
      }),
      name: Joi.string().required().messages({
        'string.base': 'Media file name must be a string',
        'any.required': 'Media file name is required'
      }),
      type: Joi.string().valid('image', 'document').required().messages({
        'string.base': 'Media file type must be a string',
        'any.only': 'Media file type must be either "image" or "document"',
        'any.required': 'Media file type is required'
      }),
      size: Joi.number().optional().messages({
        'number.base': 'Media file size must be a number'
      }),
      mimeType: Joi.string().optional().messages({
        'string.base': 'Media file MIME type must be a string'
      })
    })
  ).optional().max(5).messages({
    'array.base': 'Media files must be an array',
    'array.max': 'Maximum 5 media files allowed'
  })
})
