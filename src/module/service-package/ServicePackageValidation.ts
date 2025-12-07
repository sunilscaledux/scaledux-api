import Joi from 'joi'

export const createServicePackageSchema = Joi.object({
  title: Joi.string().required().min(1).max(200).messages({
    'string.empty': 'Title is required',
    'string.min': 'Title must be at least 1 character',
    'string.max': 'Title must not exceed 200 characters'
  }),
  category: Joi.string().required().messages({
    'string.empty': 'Category is required'
  }),
  subCategory: Joi.string().required().messages({
    'string.empty': 'Sub-category is required'
  }),
  features: Joi.array().items(Joi.string()).default([]),
  industry: Joi.array().items(Joi.string()).default([]),
  keywords: Joi.array().items(Joi.string()).default([]),
  scope: Joi.object().default({}),
  hasBasic: Joi.boolean().default(false),
  hasStandard: Joi.boolean().default(false),
  hasPremium: Joi.boolean().default(false),
  deliverables: Joi.array().default([]),
  faqs: Joi.array().default([]),
  links: Joi.array().default([]),
  requirements: Joi.array().default([]),
  status: Joi.string().valid('DRAFT', 'PUBLISHED', 'PAUSED').default('DRAFT')
})

export const updateServicePackageSchema = Joi.object({
  title: Joi.string().min(1).max(200).messages({
    'string.min': 'Title must be at least 1 character',
    'string.max': 'Title must not exceed 200 characters'
  }),
  category: Joi.string(),
  subCategory: Joi.string(),
  features: Joi.array().items(Joi.string()),
  industry: Joi.array().items(Joi.string()),
  keywords: Joi.array().items(Joi.string()),
  scope: Joi.object(),
  hasBasic: Joi.boolean(),
  hasStandard: Joi.boolean(),
  hasPremium: Joi.boolean(),
  deliverables: Joi.array(),
  faqs: Joi.array(),
  links: Joi.array(),
  requirements: Joi.array(),
  status: Joi.string().valid('DRAFT', 'PUBLISHED', 'PAUSED')
})
