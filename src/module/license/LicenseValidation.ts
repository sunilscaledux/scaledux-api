import Joi from 'joi'

export const createLicenseSchema = Joi.object({
  institute: Joi.string().required().messages({
    'string.empty': 'Institute is required',
    'any.required': 'Institute is required'
  }),
  license_name: Joi.string().required().messages({
    'string.empty': 'License name is required',
    'any.required': 'License name is required'
  }),
  completed_month: Joi.string().required().messages({
    'string.empty': 'Completed month is required',
    'any.required': 'Completed month is required'
  }),
  completed_year: Joi.string().required().messages({
    'string.empty': 'Completed year is required',
    'any.required': 'Completed year is required'
  }),
  description: Joi.string().optional().allow(''),
  skills: Joi.array().items(Joi.string()).optional().default([])
})

export const updateLicenseSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    'number.base': 'License ID must be a number',
    'number.integer': 'License ID must be an integer',
    'number.positive': 'License ID must be positive',
    'any.required': 'License ID is required'
  }),
  institute: Joi.string().required().messages({
    'string.empty': 'Institute is required',
    'any.required': 'Institute is required'
  }),
  license_name: Joi.string().required().messages({
    'string.empty': 'License name is required',
    'any.required': 'License name is required'
  }),
  completed_month: Joi.string().required().messages({
    'string.empty': 'Completed month is required',
    'any.required': 'Completed month is required'
  }),
  completed_year: Joi.string().required().messages({
    'string.empty': 'Completed year is required',
    'any.required': 'Completed year is required'
  }),
  description: Joi.string().optional().allow(''),
  skills: Joi.array().items(Joi.string()).optional().default([])
})
