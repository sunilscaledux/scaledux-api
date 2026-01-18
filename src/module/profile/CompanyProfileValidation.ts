import Joi from 'joi';

/**
 * Validation schema for updating company overview
 */
export const updateOverviewSchema = Joi.object({
  company_name: Joi.string().optional().max(255).messages({
    'string.max': 'Company name must not exceed 255 characters'
  }),
  company_description: Joi.string().optional().allow('', null).max(2000).messages({
    'string.max': 'Company description must not exceed 2000 characters'
  }),
  company_website: Joi.string().uri().optional().allow('', null).messages({
    'string.uri': 'Please provide a valid website URL'
  }),
  founded_year: Joi.number().integer().min(1800).max(new Date().getFullYear()).optional().messages({
    'number.min': 'Founded year must be after 1800',
    'number.max': 'Founded year cannot be in the future'
  }),
  company_size: Joi.string().optional().allow('', null),
  address: Joi.string().optional().allow('', null).max(500).messages({
    'string.max': 'Address must not exceed 500 characters'
  }),
  address_line_2: Joi.string().optional().allow('', null).max(500).messages({
    'string.max': 'Address line 2 must not exceed 500 characters'
  }),
  city: Joi.string().optional().allow('', null).max(100).messages({
    'string.max': 'City must not exceed 100 characters'
  }),
  zipCode: Joi.string().optional().allow('', null).max(20).messages({
    'string.max': 'Zip code must not exceed 20 characters'
  }),
  country_id: Joi.number().integer().optional().messages({
    'number.base': 'Country must be a valid number'
  }),
  state_id: Joi.number().integer().optional().messages({
    'number.base': 'State must be a valid number'
  })
});

/**
 * Validation schema for updating company details
 */
export const updateDetailsSchema = Joi.object({
  company_size: Joi.string().optional().allow('', null),
  company_stage: Joi.string().optional().allow('', null),
  team_size: Joi.number().integer().min(0).optional().messages({
    'number.min': 'Team size cannot be negative'
  }),
  address: Joi.string().optional().allow('', null).max(500).messages({
    'string.max': 'Address must not exceed 500 characters'
  }),
  city: Joi.string().optional().allow('', null).max(100).messages({
    'string.max': 'City must not exceed 100 characters'
  }),
  zipCode: Joi.string().optional().allow('', null).max(20).messages({
    'string.max': 'Zip code must not exceed 20 characters'
  }),
  country_id: Joi.number().integer().optional().messages({
    'number.base': 'Country must be a valid number'
  }),
  state_id: Joi.number().integer().optional().messages({
    'number.base': 'State must be a valid number'
  }),
  industry_id: Joi.number().integer().optional().messages({
    'number.base': 'Industry must be a valid number'
  }),
  sub_industry_id: Joi.number().integer().optional().messages({
    'number.base': 'Sub-industry must be a valid number'
  })
});

/**
 * Validation schema for updating funding information
 */
export const updateFundingSchema = Joi.object({
  funding_status: Joi.string().optional().allow('', null).max(100).messages({
    'string.max': 'Funding status must not exceed 100 characters'
  }),
  total_funding: Joi.number().min(0).optional().messages({
    'number.min': 'Total funding cannot be negative'
  })
});

/**
 * Validation schema for updating problem and solution
 */
export const updateProblemSolutionSchema = Joi.object({
  problem_statement: Joi.string().optional().allow('', null).max(5000).messages({
    'string.max': 'Problem statement must not exceed 5000 characters'
  }),
  solution_statement: Joi.string().optional().allow('', null).max(5000).messages({
    'string.max': 'Solution statement must not exceed 5000 characters'
  })
});

/**
 * Validation schema for updating target market
 */
export const updateTargetMarketSchema = Joi.object({
  target_market: Joi.string().optional().allow('', null).messages({
    'string.base': 'Target market must be a string'
  })
});

/**
 * Validation schema for updating revenue model
 */
export const updateRevenueModelSchema = Joi.object({
  revenue_model: Joi.string().optional().allow('', null).max(2000).messages({
    'string.max': 'Revenue model must not exceed 2000 characters'
  })
});

// ==================== TEAM MEMBER VALIDATIONS ====================

/**
 * Validation schema for creating a team member
 */
export const createTeamMemberSchema = Joi.object({
  name: Joi.string().required().max(255).messages({
    'string.empty': 'Name is required',
    'string.max': 'Name must not exceed 255 characters',
    'any.required': 'Name is required'
  }),
  email: Joi.string().email().optional().allow('', null).messages({
    'string.email': 'Please provide a valid email address'
  }),
  role_id: Joi.number().integer().required().messages({
    'number.base': 'Role is required',
    'any.required': 'Role is required'
  }),
  bio: Joi.string().optional().allow('', null).max(1000).messages({
    'string.max': 'Bio must not exceed 1000 characters'
  }),
  linkedin_url: Joi.string()
    .optional()
    .allow('', null)
    .pattern(/^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/)
    .messages({
      'string.pattern.base': 'Please provide a valid URL'
    })
});

/**
 * Validation schema for updating a team member
 */
export const updateTeamMemberSchema = Joi.object({
  name: Joi.string().optional().max(255).messages({
    'string.max': 'Name must not exceed 255 characters'
  }),
  email: Joi.string().email().optional().allow('', null).messages({
    'string.email': 'Please provide a valid email address'
  }),
  role_id: Joi.number().integer().optional().messages({
    'number.base': 'Role must be a valid number'
  }),
  bio: Joi.string().optional().allow('', null).max(1000).messages({
    'string.max': 'Bio must not exceed 1000 characters'
  }),
  linkedin_url: Joi.string()
    .optional()
    .allow('', null)
    .pattern(/^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/)
    .messages({
      'string.pattern.base': 'Please provide a valid URL'
    })
});
