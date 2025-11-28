import Joi from 'joi'

export const createPortfolioSchema = Joi.object({
  title: Joi.string().required().min(1).max(50).messages({
    'string.base': 'Project title must be a string',
    'string.empty': 'Project title is required',
    'string.min': 'Project title is required',
    'string.max': 'Project title is too long (max 50 characters)',
    'any.required': 'Project title is required'
  }),
  description: Joi.string().required().min(1).messages({
    'string.base': 'Description must be a string',
    'string.empty': 'Description is required',
    'any.required': 'Description is required'
  }),
  companyName: Joi.string().required().min(1).max(50).messages({
    'string.base': 'Company name must be a string',
    'string.empty': 'Company name is required',
    'string.max': 'Company name is too long (max 50 characters)',
    'any.required': 'Company name is required'
  }),
  hideCompanyName: Joi.boolean().optional().default(false),
  industryId: Joi.number().integer().positive().required().messages({
    'number.base': 'Industry ID must be a number',
    'number.integer': 'Industry ID must be an integer',
    'number.positive': 'Industry ID must be positive',
    'any.required': 'Industry is required'
  }),
  role: Joi.string().optional().allow('').max(50).messages({
    'string.base': 'Role must be a string',
    'string.max': 'Role name is too long (max 50 characters)'
  }),
  projectSkills: Joi.array().items(Joi.string()).min(2).messages({
    'array.base': 'Project skills must be an array',
    'array.min': 'Select minimum 5 skills'
  }),
  thumbnail: Joi.array().items(Joi.string()).optional().allow(null).messages({
    'array.base': 'Thumbnail must be an array'
  }),
  media: Joi.array().items(Joi.string()).optional().allow(null).messages({
    'array.base': 'Media must be an array'
  }),
  projectLink: Joi.string().optional().allow('').custom((value, helpers) => {
    if (!value || value.trim() === '') {
      return value
    }
    
    // Validate URL format (www.example.com)
    const urlPattern = /^www\.[a-zA-Z0-9-]+(\.[a-zA-Z]{2,})+$/
    if (!urlPattern.test(value.trim())) {
      return helpers.error('string.pattern.base')
    }
    
    return value.trim()
  }).messages({
    'string.base': 'Project link must be a string',
    'string.pattern.base': 'Invalid website format. Eg www.scaledux.com'
  }),
  completionMonth: Joi.string().optional().allow('').messages({
    'string.base': 'Completion month must be a string'
  }),
  completionYear: Joi.string().optional().allow('').messages({
    'string.base': 'Completion year must be a string'
  }),
  references: Joi.array().items(
    Joi.object({
      url: Joi.string().custom((value, helpers) => {
        if (!value || value.trim() === '') {
          return value
        }
        
        // Validate URL format (www.example.com)
        const urlPattern = /^www\.[a-zA-Z0-9-]+(\.[a-zA-Z]{2,})+$/
        if (!urlPattern.test(value.trim())) {
          return helpers.error('string.pattern.base')
        }
        
        return value.trim()
      }).messages({
        'string.pattern.base': 'Invalid website format. Eg www.scaledux.com'
      })
    })
  ).optional().allow(null).messages({
    'array.base': 'References must be an array'
  }),
  status: Joi.string().valid('DRAFT', 'PUBLISHED').optional().default('DRAFT').messages({
    'string.base': 'Status must be a string',
    'any.only': 'Status must be either DRAFT or PUBLISHED'
  })
})

export const updatePortfolioSchema = Joi.object({
  title: Joi.string().optional().min(1).max(50).messages({
    'string.base': 'Project title must be a string',
    'string.min': 'Project title is required',
    'string.max': 'Project title is too long (max 50 characters)'
  }),
  description: Joi.string().optional().min(1).messages({
    'string.base': 'Description must be a string',
    'string.min': 'Description is required'
  }),
  companyName: Joi.string().optional().min(1).max(50).messages({
    'string.base': 'Company name must be a string',
    'string.max': 'Company name is too long (max 50 characters)'
  }),
  hideCompanyName: Joi.boolean().optional(),
  industryId: Joi.number().integer().positive().optional().messages({
    'number.base': 'Industry ID must be a number',
    'number.integer': 'Industry ID must be an integer',
    'number.positive': 'Industry ID must be positive'
  }),
  role: Joi.string().optional().allow('').max(50).messages({
    'string.base': 'Role must be a string',
    'string.max': 'Role name is too long (max 50 characters)'
  }),
  projectSkills: Joi.array().items(Joi.string()).optional().min(2).messages({
    'array.base': 'Project skills must be an array',
    'array.min': 'Select minimum 5 skills'
  }),
  thumbnail: Joi.array().items(Joi.string()).optional().allow(null).messages({
    'array.base': 'Thumbnail must be an array'
  }),
  media: Joi.array().items(Joi.string()).optional().allow(null).messages({
    'array.base': 'Media must be an array'
  }),
  projectLink: Joi.string().optional().allow('').custom((value, helpers) => {
    if (!value || value.trim() === '') {
      return value
    }
    
    // Validate URL format (www.example.com)
    const urlPattern = /^www\.[a-zA-Z0-9-]+(\.[a-zA-Z]{2,})+$/
    if (!urlPattern.test(value.trim())) {
      return helpers.error('string.pattern.base')
    }
    
    return value.trim()
  }).messages({
    'string.base': 'Project link must be a string',
    'string.pattern.base': 'Invalid website format. Eg www.scaledux.com'
  }),
  completionMonth: Joi.string().optional().allow('').messages({
    'string.base': 'Completion month must be a string'
  }),
  completionYear: Joi.string().optional().allow('').messages({
    'string.base': 'Completion year must be a string'
  }),
  references: Joi.array().items(
    Joi.object({
      url: Joi.string().custom((value, helpers) => {
        if (!value || value.trim() === '') {
          return value
        }
        
        // Validate URL format (www.example.com)
        const urlPattern = /^www\.[a-zA-Z0-9-]+(\.[a-zA-Z]{2,})+$/
        if (!urlPattern.test(value.trim())) {
          return helpers.error('string.pattern.base')
        }
        
        return value.trim()
      }).messages({
        'string.pattern.base': 'Invalid website format. Eg www.scaledux.com'
      })
    })
  ).optional().allow(null).messages({
    'array.base': 'References must be an array'
  }),
  status: Joi.string().valid('DRAFT', 'PUBLISHED').optional().messages({
    'string.base': 'Status must be a string',
    'any.only': 'Status must be either DRAFT or PUBLISHED'
  })
})
