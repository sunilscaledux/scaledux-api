import Joi from "joi";
import { CreateEducationInput, UpdateEducationInput } from "./EducationType";
import { rejectDangerousHtml, dangerousHtmlMessages } from "../../utils/validation";

export const createEducationSchema = Joi.object<CreateEducationInput>({
  school: Joi.string().required().messages({
    'string.empty': 'School/College name is required',
    'any.required': 'School/College name is required'
  }),
  degree: Joi.string().required().messages({
    'string.empty': 'Degree is required',
    'any.required': 'Degree is required'
  }),
  area_of_study: Joi.string().required().messages({
    'string.empty': 'Area of study is required',
    'any.required': 'Area of study is required'
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
  description: Joi.string().optional().allow('', null).custom(rejectDangerousHtml).messages(dangerousHtmlMessages),
  skills: Joi.array().items(Joi.string()).optional().default([])
});

export const updateEducationSchema = Joi.object<UpdateEducationInput>({
  id: Joi.number().integer().positive().required().messages({
    'number.base': 'Invalid education ID',
    'number.positive': 'Invalid education ID',
    'any.required': 'Education ID is required'
  }),
  school: Joi.string().required().messages({
    'string.empty': 'School/College name is required',
    'any.required': 'School/College name is required'
  }),
  degree: Joi.string().required().messages({
    'string.empty': 'Degree is required',
    'any.required': 'Degree is required'
  }),
  area_of_study: Joi.string().required().messages({
    'string.empty': 'Area of study is required',
    'any.required': 'Area of study is required'
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
  description: Joi.string().optional().allow('', null).custom(rejectDangerousHtml).messages(dangerousHtmlMessages),
  skills: Joi.array().items(Joi.string()).optional().default([])
});
