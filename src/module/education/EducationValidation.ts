import Joi from "joi";
import { CreateEducationInput, UpdateEducationInput } from "./EducationType";
import { rejectAllHtml, noHtmlMessages } from "../../utils/validation";

export const createEducationSchema = Joi.object<CreateEducationInput>({
  school: Joi.string().required().max(150).custom(rejectAllHtml).messages({
    'string.empty': 'School/College name is required',
    'any.required': 'School/College name is required',
    'string.max': 'School/College name must not exceed 150 characters',
    ...noHtmlMessages,
  }),
  degree: Joi.string().required().max(120).custom(rejectAllHtml).messages({
    'string.empty': 'Degree is required',
    'any.required': 'Degree is required',
    'string.max': 'Degree must not exceed 120 characters',
    ...noHtmlMessages,
  }),
  area_of_study: Joi.string().required().max(100).custom(rejectAllHtml).messages({
    'string.empty': 'Area of study is required',
    'any.required': 'Area of study is required',
    'string.max': 'Area of study must not exceed 100 characters',
    ...noHtmlMessages,
  }),
  start_month: Joi.string().required().messages({
    'string.empty': 'Start month is required',
    'any.required': 'Start month is required'
  }),
  start_year: Joi.string().required().messages({
    'string.empty': 'Start year is required',
    'any.required': 'Start year is required'
  }),
  end_month: Joi.string().optional().allow('', null),
  end_year: Joi.string().optional().allow('', null),
  is_ongoing: Joi.boolean().default(false),
  description: Joi.string().optional().allow('', null).max(500).custom(rejectAllHtml).messages({
    'string.max': 'Description must not exceed 500 characters',
    ...noHtmlMessages,
  }),
  skills: Joi.array().items(Joi.string()).optional().default([])
});

export const updateEducationSchema = Joi.object<UpdateEducationInput>({
  id: Joi.number().integer().positive().required().messages({
    'number.base': 'Invalid education ID',
    'number.positive': 'Invalid education ID',
    'any.required': 'Education ID is required'
  }),
  school: Joi.string().required().max(150).custom(rejectAllHtml).messages({
    'string.empty': 'School/College name is required',
    'any.required': 'School/College name is required',
    'string.max': 'School/College name must not exceed 150 characters',
    ...noHtmlMessages,
  }),
  degree: Joi.string().required().max(120).custom(rejectAllHtml).messages({
    'string.empty': 'Degree is required',
    'any.required': 'Degree is required',
    'string.max': 'Degree must not exceed 120 characters',
    ...noHtmlMessages,
  }),
  area_of_study: Joi.string().required().max(100).custom(rejectAllHtml).messages({
    'string.empty': 'Area of study is required',
    'any.required': 'Area of study is required',
    'string.max': 'Area of study must not exceed 100 characters',
    ...noHtmlMessages,
  }),
  start_month: Joi.string().required().messages({
    'string.empty': 'Start month is required',
    'any.required': 'Start month is required'
  }),
  start_year: Joi.string().required().messages({
    'string.empty': 'Start year is required',
    'any.required': 'Start year is required'
  }),
  end_month: Joi.string().optional().allow('', null),
  end_year: Joi.string().optional().allow('', null),
  is_ongoing: Joi.boolean().default(false),
  description: Joi.string().optional().allow('', null).max(500).custom(rejectAllHtml).messages({
    'string.max': 'Description must not exceed 500 characters',
    ...noHtmlMessages,
  }),
  skills: Joi.array().items(Joi.string()).optional().default([])
});
