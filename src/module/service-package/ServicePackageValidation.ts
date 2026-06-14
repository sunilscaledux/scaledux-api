import Joi from 'joi'
import { rejectDangerousHtml, dangerousHtmlMessages, richTextMaxLength } from '../../utils/validation'

export const createServicePackageSchema = Joi.object({
  title: Joi.string().required().min(1).max(200).messages({
    'string.empty': 'Title is required',
    'string.min': 'Title must be at least 1 character',
    'string.max': 'Title must not exceed 200 characters'
  }),
  categoryId: Joi.number().integer().positive().required().messages({
    'number.base': 'Category is required',
    'any.required': 'Category is required'
  }),
  subCategoryId: Joi.number().integer().positive().optional().allow(null),
  features: Joi.array().items(Joi.string()).max(20).default([]).messages({ 'array.max': 'Maximum 20 features allowed' }),
  industry: Joi.array().items(Joi.string()).max(20).default([]).messages({ 'array.max': 'Maximum 20 industries allowed' }),
  keywords: Joi.array().items(Joi.string()).min(5).max(20).default([]).messages({ 'array.min': 'At least 5 keywords required', 'array.max': 'Maximum 20 keywords allowed' }),
  scope: Joi.object().default({}),
  extraAddOns: Joi.alternatives().try(Joi.array(), Joi.any()).optional().allow(null),
  hasBasic: Joi.boolean().default(false),
  hasStandard: Joi.boolean().default(false),
  hasPremium: Joi.boolean().default(false),
  basicLabel: Joi.string().optional().allow('').max(50).default('Basic'),
  standardLabel: Joi.string().optional().allow('').max(50).default('Standard'),
  premiumLabel: Joi.string().optional().allow('').max(50).default('Premium'),
  packageDescription: Joi.string().optional().allow('').default('').custom(richTextMaxLength(3000)).custom(rejectDangerousHtml).messages(dangerousHtmlMessages),
  deliverables: Joi.array().default([]),
  faqs: Joi.array().default([]),
  links: Joi.array().default([]),
  requirements: Joi.array().default([]),
  thumbnail: Joi.alternatives().try(Joi.string().allow(null, ''), Joi.array()).optional().allow(null),
  images: Joi.array().items(Joi.string()).optional().default([]),
  video: Joi.array().items(Joi.string()).optional().default([]),
  documents: Joi.array().items(Joi.string()).optional().default([]),
  status: Joi.string().valid('DRAFT', 'PUBLISHED', 'PAUSED').default('DRAFT')
})

export const updateServicePackageSchema = Joi.object({
  title: Joi.string().min(1).max(200).messages({
    'string.min': 'Title must be at least 1 character',
    'string.max': 'Title must not exceed 200 characters'
  }),
  categoryId: Joi.number().integer().positive().optional(),
  subCategoryId: Joi.number().integer().positive().optional().allow(null),
  features: Joi.array().items(Joi.string()).max(20).messages({ 'array.max': 'Maximum 20 features allowed' }),
  industry: Joi.array().items(Joi.string()).max(20).messages({ 'array.max': 'Maximum 20 industries allowed' }),
  keywords: Joi.array().items(Joi.string()).max(20).messages({ 'array.max': 'Maximum 20 keywords allowed' }),
  scope: Joi.object(),
  extraAddOns: Joi.alternatives().try(Joi.array(), Joi.any()).optional().allow(null),
  hasBasic: Joi.boolean(),
  hasStandard: Joi.boolean(),
  hasPremium: Joi.boolean(),
  basicLabel: Joi.string().optional().allow('').max(50),
  standardLabel: Joi.string().optional().allow('').max(50),
  premiumLabel: Joi.string().optional().allow('').max(50),
  packageDescription: Joi.string().optional().allow('').custom(richTextMaxLength(3000)).custom(rejectDangerousHtml).messages(dangerousHtmlMessages),
  deliverables: Joi.array(),
  faqs: Joi.array(),
  links: Joi.array(),
  requirements: Joi.array(),
  thumbnail: Joi.alternatives().try(Joi.string().allow(null, ''), Joi.array()).optional().allow(null),
  images: Joi.array().items(Joi.string()).optional(),
  video: Joi.array().items(Joi.string()).optional(),
  documents: Joi.array().items(Joi.string()).optional(),
  status: Joi.string().valid('DRAFT', 'PUBLISHED', 'PAUSED')
})
