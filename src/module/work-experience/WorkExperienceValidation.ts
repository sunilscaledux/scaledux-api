import Joi from 'joi'
import { rejectAllHtml, noHtmlMessages } from '../../utils/validation'

export const createWorkExperienceSchema = Joi.object({
  role: Joi.string().required().messages({
    'string.empty': 'Role is required',
    'any.required': 'Role is required'
  }),
  company: Joi.string().required().messages({
    'string.empty': 'Company is required',
    'any.required': 'Company is required'
  }),
  company_website: Joi.string().optional().allow(''),
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
  role: Joi.string().required().messages({
    'string.empty': 'Role is required',
    'any.required': 'Role is required'
  }),
  company: Joi.string().required().messages({
    'string.empty': 'Company is required',
    'any.required': 'Company is required'
  }),
  company_website: Joi.string().optional().allow(''),
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
