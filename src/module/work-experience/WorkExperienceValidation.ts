import Joi from 'joi'
import { rejectAllHtml, noHtmlMessages, validateSafeUrl, safeUrlMessages } from '../../utils/validation'

export const createWorkExperienceSchema = Joi.object({
  role: Joi.string().required().max(100).custom(rejectAllHtml).messages({
    'string.empty': 'Role is required',
    'any.required': 'Role is required',
    'string.max': 'Role must not exceed 100 characters',
    ...noHtmlMessages,
  }),
  company: Joi.string().required().max(150).custom(rejectAllHtml).messages({
    'string.empty': 'Company is required',
    'any.required': 'Company is required',
    'string.max': 'Company must not exceed 150 characters',
    ...noHtmlMessages,
  }),
  company_website: Joi.string().optional().allow('').max(2048).custom(validateSafeUrl).messages({
    'string.max': 'Website URL must not exceed 2048 characters',
    ...safeUrlMessages,
  }),
  description: Joi.string().optional().allow('').custom(rejectAllHtml).messages(noHtmlMessages),
  start_month: Joi.string().required().messages({
    'string.empty': 'Start month is required',
    'any.required': 'Start month is required'
  }),
  start_year: Joi.string().required().messages({
    'string.empty': 'Start year is required',
    'any.required': 'Start year is required'
  }),
  end_month: Joi.string().optional().allow(''),
  end_year: Joi.string().optional().allow(''),
  is_current: Joi.boolean().default(false)
})

export const updateWorkExperienceSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    'number.base': 'Work experience ID must be a number',
    'number.integer': 'Work experience ID must be an integer',
    'number.positive': 'Work experience ID must be positive',
    'any.required': 'Work experience ID is required'
  }),
  role: Joi.string().required().max(100).custom(rejectAllHtml).messages({
    'string.empty': 'Role is required',
    'any.required': 'Role is required',
    'string.max': 'Role must not exceed 100 characters',
    ...noHtmlMessages,
  }),
  company: Joi.string().required().max(150).custom(rejectAllHtml).messages({
    'string.empty': 'Company is required',
    'any.required': 'Company is required',
    'string.max': 'Company must not exceed 150 characters',
    ...noHtmlMessages,
  }),
  company_website: Joi.string().optional().allow('').max(2048).custom(validateSafeUrl).messages({
    'string.max': 'Website URL must not exceed 2048 characters',
    ...safeUrlMessages,
  }),
  description: Joi.string().optional().allow('').custom(rejectAllHtml).messages(noHtmlMessages),
  start_month: Joi.string().required().messages({
    'string.empty': 'Start month is required',
    'any.required': 'Start month is required'
  }),
  start_year: Joi.string().required().messages({
    'string.empty': 'Start year is required',
    'any.required': 'Start year is required'
  }),
  end_month: Joi.string().optional().allow(''),
  end_year: Joi.string().optional().allow(''),
  is_current: Joi.boolean().default(false)
})
