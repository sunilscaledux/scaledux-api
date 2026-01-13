import Joi from 'joi';

export const createCompanyDetailSchema = Joi.object({
  company_name: Joi.string().required().min(2).max(255).messages({
    'string.empty': 'Company name is required',
    'string.min': 'Company name must be at least 2 characters',
    'string.max': 'Company name cannot exceed 255 characters',
    'any.required': 'Company name is required'
  }),
  company_tagline: Joi.string().max(500).optional().allow(null, ''),
  company_logo: Joi.string().uri().optional().allow(null, ''),
  company_cover_image: Joi.string().uri().optional().allow(null, ''),
  year_founded: Joi.number().integer().min(1800).max(new Date().getFullYear()).optional().allow(null),
  company_size: Joi.string().valid('1-10', '11-50', '51-200', '201-500', '501-1000', '1000+').optional().allow(null),
  headquarters: Joi.string().max(255).optional().allow(null, ''),
  company_location: Joi.string().max(255).optional().allow(null, ''),
  company_website: Joi.string().uri().optional().allow(null, ''),
  industry: Joi.string().max(255).optional().allow(null, ''),
  company_type: Joi.string().valid('Startup', 'SME', 'Enterprise', 'Non-profit', 'Government').optional().allow(null),
  description: Joi.string().max(5000).optional().allow(null, ''),
  problem_statement: Joi.string().max(2000).optional().allow(null, ''),
  solution: Joi.string().max(2000).optional().allow(null, ''),
  target_market: Joi.string().max(2000).optional().allow(null, ''),
  unique_value_prop: Joi.string().max(1000).optional().allow(null, ''),
  business_model: Joi.string().max(2000).optional().allow(null, ''),
  revenue_model: Joi.string().max(2000).optional().allow(null, ''),
  funding_stage: Joi.string().valid(
    'Pre-seed',
    'Seed',
    'Series A',
    'Series B',
    'Series C',
    'Series D+',
    'IPO',
    'Acquired',
    'Bootstrapped'
  ).optional().allow(null),
  total_funding: Joi.number().min(0).optional().allow(null),
  seeking_funding: Joi.boolean().optional().default(false),
  funding_amount: Joi.number().min(0).optional().allow(null),
  currency_id: Joi.number().integer().positive().optional().allow(null),
  country_id: Joi.number().integer().positive().optional().allow(null),
  state_id: Joi.number().integer().positive().optional().allow(null),
  social_links: Joi.object({
    linkedin: Joi.string().uri().optional().allow(null, ''),
    twitter: Joi.string().uri().optional().allow(null, ''),
    facebook: Joi.string().uri().optional().allow(null, ''),
    instagram: Joi.string().uri().optional().allow(null, '')
  }).optional().allow(null)
});

export const updateCompanyDetailSchema = Joi.object({
  company_name: Joi.string().min(2).max(255).optional(),
  company_tagline: Joi.string().max(500).optional().allow(null, ''),
  company_logo: Joi.string().uri().optional().allow(null, ''),
  company_cover_image: Joi.string().uri().optional().allow(null, ''),
  year_founded: Joi.number().integer().min(1800).max(new Date().getFullYear()).optional().allow(null),
  company_size: Joi.string().valid('1-10', '11-50', '51-200', '201-500', '501-1000', '1000+').optional().allow(null),
  headquarters: Joi.string().max(255).optional().allow(null, ''),
  company_location: Joi.string().max(255).optional().allow(null, ''),
  company_website: Joi.string().uri().optional().allow(null, ''),
  industry: Joi.string().max(255).optional().allow(null, ''),
  company_type: Joi.string().valid('Startup', 'SME', 'Enterprise', 'Non-profit', 'Government').optional().allow(null),
  description: Joi.string().max(5000).optional().allow(null, ''),
  problem_statement: Joi.string().max(2000).optional().allow(null, ''),
  solution: Joi.string().max(2000).optional().allow(null, ''),
  target_market: Joi.string().max(2000).optional().allow(null, ''),
  unique_value_prop: Joi.string().max(1000).optional().allow(null, ''),
  business_model: Joi.string().max(2000).optional().allow(null, ''),
  revenue_model: Joi.string().max(2000).optional().allow(null, ''),
  funding_stage: Joi.string().valid(
    'Pre-seed',
    'Seed',
    'Series A',
    'Series B',
    'Series C',
    'Series D+',
    'IPO',
    'Acquired',
    'Bootstrapped'
  ).optional().allow(null),
  total_funding: Joi.number().min(0).optional().allow(null),
  seeking_funding: Joi.boolean().optional(),
  funding_amount: Joi.number().min(0).optional().allow(null),
  currency_id: Joi.number().integer().positive().optional().allow(null),
  country_id: Joi.number().integer().positive().optional().allow(null),
  state_id: Joi.number().integer().positive().optional().allow(null),
  social_links: Joi.object({
    linkedin: Joi.string().uri().optional().allow(null, ''),
    twitter: Joi.string().uri().optional().allow(null, ''),
    facebook: Joi.string().uri().optional().allow(null, ''),
    instagram: Joi.string().uri().optional().allow(null, '')
  }).optional().allow(null)
}).min(1);
