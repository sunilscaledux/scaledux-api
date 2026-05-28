import Joi from 'joi'
import { rejectAllHtml, noHtmlMessages, validateSafeUrl, safeUrlMessages } from '../../utils/validation'

export const createInvestmentPortfolioSchema = Joi.object({
  companyName: Joi.string().required().min(1).max(150).custom(rejectAllHtml).messages({
    'string.base': 'Company name must be a string',
    'string.empty': 'Company name is required',
    'string.min': 'Company name is required',
    'string.max': 'Company name must not exceed 150 characters',
    'any.required': 'Company name is required',
    ...noHtmlMessages,
  }),
  companyLogo: Joi.string().required().messages({
    'string.empty': 'Upload company logo',
    'any.required': 'Upload company logo',
  }),
  description: Joi.string().required().min(1).max(3000).custom(rejectAllHtml).messages({
    'string.empty': 'Company description is required',
    'any.required': 'Company description is required',
    'string.max': 'Company description must not exceed 3000 characters',
    ...noHtmlMessages,
  }),
  companyWebsite: Joi.string().required().max(2048).custom(validateSafeUrl).messages({
    'string.empty': 'Company website is required',
    'any.required': 'Company website is required',
    'string.max': 'Website URL must not exceed 2048 characters',
    ...safeUrlMessages,
  }),
  industryId: Joi.number().integer().positive().optional(),
  subIndustryId: Joi.number().integer().positive().optional(),
  investmentSize: Joi.number().min(0).max(1000000000000).optional().messages({
    'number.max': 'Investment size must not exceed 1 Trillion',
  }),
  investmentSizeCurrency: Joi.string().valid('USD', 'INR').optional().allow(''),
  investmentDate: Joi.string().optional().allow(''),
  roundParticipatedIn: Joi.string().optional().allow(''),
  currentStatus: Joi.string().valid('Active', 'Exited', 'Acquired').optional(),
  boardAdvisoryRole: Joi.string().optional().allow(''),
  impactInCompanyGrowth: Joi.string().optional().allow(''),
  exitInformation: Joi.string().optional().allow(''),
  status: Joi.string().valid('DRAFT', 'PUBLISHED').optional().default('DRAFT')
})

export const updateInvestmentPortfolioSchema = Joi.object({
  companyName: Joi.string().optional().min(1).max(150).custom(rejectAllHtml).messages({
    'string.max': 'Company name must not exceed 150 characters',
    ...noHtmlMessages,
  }),
  companyLogo: Joi.string().optional().allow(null, ''),
  description: Joi.string().optional().allow('').max(3000).custom(rejectAllHtml).messages({
    'string.max': 'Company description must not exceed 3000 characters',
    ...noHtmlMessages,
  }),
  companyWebsite: Joi.string().optional().allow('').max(2048).custom(validateSafeUrl).messages({
    'string.max': 'Website URL must not exceed 2048 characters',
    ...safeUrlMessages,
  }),
  industryId: Joi.number().integer().positive().optional(),
  subIndustryId: Joi.number().integer().positive().optional(),
  investmentSize: Joi.number().min(0).max(1000000000000).optional().messages({
    'number.max': 'Investment size must not exceed 1 Trillion',
  }),
  investmentSizeCurrency: Joi.string().valid('USD', 'INR').optional().allow(''),
  investmentDate: Joi.string().optional().allow(''),
  roundParticipatedIn: Joi.string().optional().allow(''),
  currentStatus: Joi.string().valid('Active', 'Exited', 'Acquired').optional(),
  boardAdvisoryRole: Joi.string().optional().allow(''),
  impactInCompanyGrowth: Joi.string().optional().allow(''),
  exitInformation: Joi.string().optional().allow(''),
  status: Joi.string().valid('DRAFT', 'PUBLISHED').optional()
})

export const createDraftInvestmentPortfolioSchema = Joi.object({
  companyName: Joi.string().optional().allow('').max(150).custom(rejectAllHtml).messages({
    'string.max': 'Company name must not exceed 150 characters',
    ...noHtmlMessages,
  }),
  companyLogo: Joi.string().optional().allow(null, ''),
  description: Joi.string().optional().allow('').max(3000).custom(rejectAllHtml).messages({
    'string.max': 'Company description must not exceed 3000 characters',
    ...noHtmlMessages,
  }),
  companyWebsite: Joi.string().optional().allow('').max(2048).custom(validateSafeUrl).messages({
    'string.max': 'Website URL must not exceed 2048 characters',
    ...safeUrlMessages,
  }),
  industryId: Joi.number().integer().positive().optional(),
  subIndustryId: Joi.number().integer().positive().optional(),
  investmentSize: Joi.number().min(0).max(1000000000000).optional().messages({
    'number.max': 'Investment size must not exceed 1 Trillion',
  }),
  investmentSizeCurrency: Joi.string().valid('USD', 'INR').optional().allow(''),
  investmentDate: Joi.string().optional().allow(''),
  roundParticipatedIn: Joi.string().optional().allow(''),
  currentStatus: Joi.string().optional().allow(''),
  boardAdvisoryRole: Joi.string().optional().allow(''),
  impactInCompanyGrowth: Joi.string().optional().allow(''),
  exitInformation: Joi.string().optional().allow(''),
  status: Joi.string().valid('DRAFT', 'PUBLISHED').optional().default('DRAFT')
})

export const updateDraftInvestmentPortfolioSchema = Joi.object({
  companyName: Joi.string().optional().allow('').max(150).custom(rejectAllHtml).messages({
    'string.max': 'Company name must not exceed 150 characters',
    ...noHtmlMessages,
  }),
  companyLogo: Joi.string().optional().allow(null, ''),
  description: Joi.string().optional().allow('').max(3000).custom(rejectAllHtml).messages({
    'string.max': 'Company description must not exceed 3000 characters',
    ...noHtmlMessages,
  }),
  companyWebsite: Joi.string().optional().allow('').max(2048).custom(validateSafeUrl).messages({
    'string.max': 'Website URL must not exceed 2048 characters',
    ...safeUrlMessages,
  }),
  industryId: Joi.number().integer().positive().optional(),
  subIndustryId: Joi.number().integer().positive().optional(),
  investmentSize: Joi.number().min(0).max(1000000000000).optional().messages({
    'number.max': 'Investment size must not exceed 1 Trillion',
  }),
  investmentSizeCurrency: Joi.string().valid('USD', 'INR').optional().allow(''),
  investmentDate: Joi.string().optional().allow(''),
  roundParticipatedIn: Joi.string().optional().allow(''),
  currentStatus: Joi.string().optional().allow(''),
  boardAdvisoryRole: Joi.string().optional().allow(''),
  impactInCompanyGrowth: Joi.string().optional().allow(''),
  exitInformation: Joi.string().optional().allow(''),
  status: Joi.string().valid('DRAFT', 'PUBLISHED').optional()
})
