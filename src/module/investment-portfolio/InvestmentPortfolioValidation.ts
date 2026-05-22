import Joi from 'joi'
import { rejectAllHtml, noHtmlMessages } from '../../utils/validation'

export const createInvestmentPortfolioSchema = Joi.object({
  companyName: Joi.string().required().min(1).max(200).messages({
    'string.base': 'Company name must be a string',
    'string.empty': 'Company name is required',
    'string.min': 'Company name is required',
    'any.required': 'Company name is required'
  }),
  companyLogo: Joi.string().optional().allow(null, ''),
  description: Joi.string().optional().allow('').custom(rejectAllHtml).messages(noHtmlMessages),
  companyWebsite: Joi.string().optional().allow(''),
  industryId: Joi.number().integer().positive().optional(),
  subIndustryId: Joi.number().integer().positive().optional(),
  investmentSize: Joi.number().min(0).optional(),
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
  companyName: Joi.string().optional().min(1).max(200),
  companyLogo: Joi.string().optional().allow(null, ''),
  description: Joi.string().optional().allow('').custom(rejectAllHtml).messages(noHtmlMessages),
  companyWebsite: Joi.string().optional().allow(''),
  industryId: Joi.number().integer().positive().optional(),
  subIndustryId: Joi.number().integer().positive().optional(),
  investmentSize: Joi.number().min(0).optional(),
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
  companyName: Joi.string().optional().allow('').max(200),
  companyLogo: Joi.string().optional().allow(null, ''),
  description: Joi.string().optional().allow('').custom(rejectAllHtml).messages(noHtmlMessages),
  companyWebsite: Joi.string().optional().allow(''),
  industryId: Joi.number().integer().positive().optional(),
  subIndustryId: Joi.number().integer().positive().optional(),
  investmentSize: Joi.number().min(0).optional(),
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
  companyName: Joi.string().optional().allow('').max(200),
  companyLogo: Joi.string().optional().allow(null, ''),
  description: Joi.string().optional().allow('').custom(rejectAllHtml).messages(noHtmlMessages),
  companyWebsite: Joi.string().optional().allow(''),
  industryId: Joi.number().integer().positive().optional(),
  subIndustryId: Joi.number().integer().positive().optional(),
  investmentSize: Joi.number().min(0).optional(),
  investmentSizeCurrency: Joi.string().valid('USD', 'INR').optional().allow(''),
  investmentDate: Joi.string().optional().allow(''),
  roundParticipatedIn: Joi.string().optional().allow(''),
  currentStatus: Joi.string().optional().allow(''),
  boardAdvisoryRole: Joi.string().optional().allow(''),
  impactInCompanyGrowth: Joi.string().optional().allow(''),
  exitInformation: Joi.string().optional().allow(''),
  status: Joi.string().valid('DRAFT', 'PUBLISHED').optional()
})
