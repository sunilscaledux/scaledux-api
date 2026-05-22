import Joi from 'joi'
import { rejectDangerousHtml, dangerousHtmlMessages, validateSafeUrl, safeUrlMessages } from '../../utils/validation'

export const createPortfolioSchema = Joi.object({
  title: Joi.string().required().min(1).max(125).messages({
    'string.base': 'Project title must be a string',
    'string.empty': 'Project title is required',
    'string.min': 'Project title is required',
    'string.max': 'Project title is too long (max 125 characters)',
    'any.required': 'Project title is required'
  }),
  description: Joi.string().required().min(1).custom(rejectDangerousHtml).messages({
    'string.base': 'Description must be a string',
    'string.empty': 'Description is required',
    'any.required': 'Description is required',
    ...dangerousHtmlMessages,
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
    'array.min': 'Select minimum 2 skills'
  }),
  thumbnail: Joi.string().optional().allow(null, '').messages({
    'string.base': 'Thumbnail must be a string (URL or path)'
  }),
  media: Joi.array().items(Joi.string()).optional().allow(null).messages({
    'array.base': 'Media must be an array'
  }),
  projectLink: Joi.string().optional().allow('').max(2048).custom(validateSafeUrl).messages({
    'string.max': 'Project link must not exceed 2048 characters',
    ...safeUrlMessages,
  }),
  completionMonth: Joi.string().optional().allow('').messages({
    'string.base': 'Completion month must be a string'
  }),
  completionYear: Joi.string().optional().allow('').messages({
    'string.base': 'Completion year must be a string'
  }),
  references: Joi.array().items(
    Joi.object({
      url: Joi.string().optional().allow('').max(2048).custom(validateSafeUrl).messages({
        'string.max': 'URL must not exceed 2048 characters',
        ...safeUrlMessages,
      })
    }).options({ stripUnknown: true })
  ).optional().allow(null).messages({
    'array.base': 'References must be an array'
  }),
  status: Joi.string().valid('DRAFT', 'PUBLISHED').optional().default('DRAFT').messages({
    'string.base': 'Status must be a string',
    'any.only': 'Status must be either DRAFT or PUBLISHED'
  })
})

export const updatePortfolioSchema = Joi.object({
  title: Joi.string().optional().min(1).max(125).messages({
    'string.base': 'Project title must be a string',
    'string.min': 'Project title is required',
    'string.max': 'Project title is too long (max 125 characters)'
  }),
  description: Joi.string().optional().min(1).custom(rejectDangerousHtml).messages({
    'string.base': 'Description must be a string',
    'string.min': 'Description is required',
    ...dangerousHtmlMessages,
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
    'array.min': 'Select minimum 2 skills'
  }),
  thumbnail: Joi.string().optional().allow(null, '').messages({
    'string.base': 'Thumbnail must be a string (URL or path)'
  }),
  media: Joi.array().items(Joi.string()).optional().allow(null).messages({
    'array.base': 'Media must be an array'
  }),
  projectLink: Joi.string().optional().allow('').max(2048).custom(validateSafeUrl).messages({
    'string.max': 'Project link must not exceed 2048 characters',
    ...safeUrlMessages,
  }),
  completionMonth: Joi.string().optional().allow('').messages({
    'string.base': 'Completion month must be a string'
  }),
  completionYear: Joi.string().optional().allow('').messages({
    'string.base': 'Completion year must be a string'
  }),
  references: Joi.array().items(
    Joi.object({
      url: Joi.string().optional().allow('').max(2048).custom(validateSafeUrl).messages({
        'string.max': 'URL must not exceed 2048 characters',
        ...safeUrlMessages,
      })
    }).options({ stripUnknown: true })
  ).optional().allow(null).messages({
    'array.base': 'References must be an array'
  }),
  status: Joi.string().valid('DRAFT', 'PUBLISHED').optional().messages({
    'string.base': 'Status must be a string',
    'any.only': 'Status must be either DRAFT or PUBLISHED'
  })
})

// Draft schema - no validation required for drafts
export const createDraftPortfolioSchema = Joi.object({
  title: Joi.string().optional().allow('').max(125),
  description: Joi.string().optional().allow('').custom(rejectDangerousHtml).messages(dangerousHtmlMessages),
  companyName: Joi.string().optional().allow('').max(50),
  hideCompanyName: Joi.boolean().optional().default(false),
  industryId: Joi.number().integer().positive().optional(),
  role: Joi.string().optional().allow('').max(50),
  projectSkills: Joi.array().items(Joi.string()).optional(),
  thumbnail: Joi.alternatives().try(Joi.string().allow(null, ''), Joi.array().items(Joi.string())).optional(),
  media: Joi.array().items(Joi.string()).optional().allow(null),
  projectLink: Joi.string().optional().allow(''),
  completionMonth: Joi.string().optional().allow(''),
  completionYear: Joi.string().optional().allow(''),
  references: Joi.array().items(
    Joi.object({
      url: Joi.string().optional().allow('')
    }).options({ stripUnknown: true })
  ).optional().allow(null),
  status: Joi.string().valid('DRAFT', 'PUBLISHED').optional().default('DRAFT')
})

export const updateDraftPortfolioSchema = Joi.object({
  title: Joi.string().optional().allow('').max(125),
  description: Joi.string().optional().allow('').custom(rejectDangerousHtml).messages(dangerousHtmlMessages),
  companyName: Joi.string().optional().allow('').max(50),
  hideCompanyName: Joi.boolean().optional(),
  industryId: Joi.number().integer().positive().optional(),
  role: Joi.string().optional().allow('').max(50),
  projectSkills: Joi.array().items(Joi.string()).optional(),
  thumbnail: Joi.alternatives().try(Joi.string().allow(null, ''), Joi.array().items(Joi.string())).optional(),
  media: Joi.array().items(Joi.string()).optional().allow(null),
  projectLink: Joi.string().optional().allow(''),
  completionMonth: Joi.string().optional().allow(''),
  completionYear: Joi.string().optional().allow(''),
  references: Joi.array().items(
    Joi.object({
      url: Joi.string().optional().allow('')
    }).options({ stripUnknown: true })
  ).optional().allow(null),
  status: Joi.string().valid('DRAFT', 'PUBLISHED').optional()
})
