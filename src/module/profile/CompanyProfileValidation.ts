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
  cin: Joi.string().optional().allow('', null).max(50).messages({
    'string.max': 'CIN must not exceed 50 characters'
  }),
  is_registered: Joi.boolean().optional(),
  company_website: Joi.string()
    .optional()
    .allow('', null)
    .trim()
    .pattern(/^(www\.)?[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}$/)
    .messages({
      'string.pattern.base': 'Please provide a valid website URL (e.g., example.com or www.example.com)'
    }),
  founded_year: Joi.number().integer().min(1800).max(new Date().getFullYear()).optional().messages({
    'number.min': 'Founded year must be after 1800',
    'number.max': 'Founded year cannot be in the future'
  }),
  company_size: Joi.string().optional().allow('', null),
  // Headquarters location
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
  }),
  // Branch office
  is_branch_same_as_hq: Joi.boolean().optional(),
  branch_address: Joi.string().optional().allow('', null).max(500).messages({
    'string.max': 'Branch address must not exceed 500 characters'
  }),
  branch_address_line_2: Joi.string().optional().allow('', null).max(500).messages({
    'string.max': 'Branch address line 2 must not exceed 500 characters'
  }),
  branch_city: Joi.string().optional().allow('', null).max(100).messages({
    'string.max': 'Branch city must not exceed 100 characters'
  }),
  branch_zipCode: Joi.string().optional().allow('', null).max(20).messages({
    'string.max': 'Branch zip code must not exceed 20 characters'
  }),
  branch_country_id: Joi.number().integer().optional().allow(null).messages({
    'number.base': 'Branch country must be a valid number'
  }),
  branch_state_id: Joi.number().integer().optional().allow(null).messages({
    'number.base': 'Branch state must be a valid number'
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
 * Validation schema for creating a funding round
 */
export const createFundingRoundSchema = Joi.object({
  investor_name: Joi.string().required().max(255).messages({
    'string.empty': 'Investor name is required',
    'string.max': 'Investor name must not exceed 255 characters'
  }),
  funding_stage: Joi.string().required().max(100).messages({
    'string.empty': 'Funding stage is required',
    'string.max': 'Funding stage must not exceed 100 characters'
  }),
  funding_amount: Joi.number().required().min(0).messages({
    'number.base': 'Funding amount must be a number',
    'any.required': 'Funding amount is required',
    'number.min': 'Funding amount cannot be negative'
  }),
  funding_date: Joi.date().required().messages({
    'date.base': 'Funding date must be a valid date',
    'any.required': 'Funding date is required'
  }),
  funding_valuation: Joi.number().optional().min(0).allow(null).messages({
    'number.min': 'Funding valuation cannot be negative'
  })
});

/**
 * Validation schema for updating a funding round
 */
export const updateFundingRoundSchema = Joi.object({
  investor_name: Joi.string().optional().max(255).messages({
    'string.max': 'Investor name must not exceed 255 characters'
  }),
  funding_stage: Joi.string().optional().max(100).messages({
    'string.max': 'Funding stage must not exceed 100 characters'
  }),
  funding_amount: Joi.number().optional().min(0).messages({
    'number.min': 'Funding amount cannot be negative'
  }),
  funding_date: Joi.date().optional().messages({
    'date.base': 'Funding date must be a valid date'
  }),
  funding_valuation: Joi.number().optional().min(0).allow(null).messages({
    'number.min': 'Funding valuation cannot be negative'
  })
});

/**
 * Validation schema for raising fund
 */
export const raisingFundSchema = Joi.object({
  is_raising: Joi.boolean().required().messages({
    'any.required': 'Raising status is required'
  }),
  funding_stage: Joi.string().optional().max(100).allow(null, ''),
  round_type: Joi.string().optional().max(100).allow(null, '').messages({
    'string.max': 'Round type must not exceed 100 characters'
  }),
  target_amount: Joi.number().optional().min(0).allow(null).messages({
    'number.min': 'Target amount cannot be negative'
  }),
  expected_close_date: Joi.string().optional().allow(null, ''),
  valuation_min: Joi.number().optional().min(0).allow(null),
  valuation_max: Joi.number().optional().min(0).allow(null),
  has_committed: Joi.boolean().optional().allow(null),
  committed_amount: Joi.number().optional().min(0).allow(null),
  committed_investor: Joi.string().optional().max(200).allow(null, ''),
  uses_of_fund: Joi.object().optional().allow(null).messages({
    'object.base': 'Uses of fund must be a valid object'
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
  revenue_models: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      is_primary: Joi.boolean().optional().default(false),
      is_secondary: Joi.boolean().optional().default(false)
    })
  ).max(5).optional().allow(null),
  revenue_description: Joi.string().optional().allow('', null).max(5000).messages({
    'string.max': 'Revenue description must not exceed 5000 characters'
  })
});

/**
 * Validation schema for updating traction
 */
export const updateTractionSchema = Joi.object({
  traction_title: Joi.string().optional().allow('', null).max(255).messages({
    'string.max': 'Traction title must not exceed 255 characters'
  }),
  traction_document: Joi.string().optional().allow('', null).messages({
    'string.base': 'Traction document must be a string'
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
  email: Joi.string().email({ tlds: { allow: false } }).optional().allow('', null).messages({
    'string.email': 'Please provide a valid email address'
  }),
  role: Joi.string().required().max(255).messages({
    'string.empty': 'Role is required',
    'string.max': 'Role must not exceed 255 characters',
    'any.required': 'Role is required'
  }),
  is_cofounder: Joi.boolean().optional().default(false),
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
  email: Joi.string().email({ tlds: { allow: false } }).optional().allow('', null).messages({
    'string.email': 'Please provide a valid email address'
  }),
  role: Joi.string().optional().max(255).messages({
    'string.max': 'Role must not exceed 255 characters'
  }),
  is_cofounder: Joi.boolean().optional(),
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
