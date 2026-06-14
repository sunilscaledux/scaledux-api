import Joi from 'joi'
import { rejectAllHtml, noHtmlMessages } from '../../utils/validation'

export const createLicenseSchema = Joi.object({
  institute: Joi.string().required().max(150).custom(rejectAllHtml).messages({
    'string.empty': 'Institute is required',
    'any.required': 'Institute is required',
    'string.max': 'Institute must not exceed 150 characters',
    ...noHtmlMessages,
  }),
  license_name: Joi.string().required().max(120).custom(rejectAllHtml).messages({
    'string.empty': 'License name is required',
    'any.required': 'License name is required',
    'string.max': 'License name must not exceed 120 characters',
    ...noHtmlMessages,
  }),
  completed_month: Joi.string().required().messages({
    'string.empty': 'Completed month is required',
    'any.required': 'Completed month is required'
  }),
  completed_year: Joi.string().required().messages({
    'string.empty': 'Completed year is required',
    'any.required': 'Completed year is required'
  }),
  description: Joi.string().optional().allow('').custom(rejectAllHtml).messages(noHtmlMessages),
  skills: Joi.array().items(Joi.string()).min(2).max(20).optional().default([]).messages({
    'array.min': 'Minimum 2 skills required',
    'array.max': 'Maximum 20 skills allowed'
  })
})

export const updateLicenseSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    'number.base': 'License ID must be a number',
    'number.integer': 'License ID must be an integer',
    'number.positive': 'License ID must be positive',
    'any.required': 'License ID is required'
  }),
  institute: Joi.string().required().max(150).custom(rejectAllHtml).messages({
    'string.empty': 'Institute is required',
    'any.required': 'Institute is required',
    'string.max': 'Institute must not exceed 150 characters',
    ...noHtmlMessages,
  }),
  license_name: Joi.string().required().max(120).custom(rejectAllHtml).messages({
    'string.empty': 'License name is required',
    'any.required': 'License name is required',
    'string.max': 'License name must not exceed 120 characters',
    ...noHtmlMessages,
  }),
  completed_month: Joi.string().required().messages({
    'string.empty': 'Completed month is required',
    'any.required': 'Completed month is required'
  }),
  completed_year: Joi.string().required().messages({
    'string.empty': 'Completed year is required',
    'any.required': 'Completed year is required'
  }),
  description: Joi.string().optional().allow('').custom(rejectAllHtml).messages(noHtmlMessages),
  skills: Joi.array().items(Joi.string()).min(2).max(20).optional().default([]).messages({
    'array.min': 'Minimum 2 skills required',
    'array.max': 'Maximum 20 skills allowed'
  })
})
