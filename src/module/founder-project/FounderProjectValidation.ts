import Joi from 'joi'

export const createFounderProjectSchema = Joi.object({
  projectTitle: Joi.string().required().min(1).max(50).messages({
    'string.base': 'Project title must be a string',
    'string.empty': 'Project title is required',
    'string.min': 'Project title is required',
    'string.max': 'Project title is too long (max 50 characters)',
    'any.required': 'Project title is required'
  }),
  projectDescription: Joi.string().required().min(1).max(3000).messages({
    'string.base': 'Description must be a string',
    'string.empty': 'Description is required',
    'string.max': 'Description is too long (max 3000 characters)',
    'any.required': 'Description is required'
  }),
  categoryId: Joi.number().integer().positive().required().messages({
    'number.base': 'Category ID must be a number',
    'number.integer': 'Category ID must be an integer',
    'number.positive': 'Category ID must be positive',
    'any.required': 'Category is required'
  }),
  subCategoryId: Joi.number().integer().positive().optional().allow(null).messages({
    'number.base': 'Sub-category ID must be a number',
    'number.integer': 'Sub-category ID must be an integer',
    'number.positive': 'Sub-category ID must be positive'
  }),
  projectFiles: Joi.array().items(
    Joi.object({
      url: Joi.string().required()
    })
  ).optional().allow(null).messages({
    'array.base': 'Project files must be an array'
  }),
  scopeOfWork: Joi.string().required().min(1).messages({
    'string.base': 'Scope of work must be a string',
    'string.empty': 'Scope of work is required',
    'any.required': 'Scope of work is required'
  }),
  skillsRequired: Joi.array().items(Joi.string()).min(3).messages({
    'array.base': 'Skills required must be an array',
    'array.min': 'At least 3 skills are required'
  }),
  experienceNeeded: Joi.string().required().min(1).messages({
    'string.base': 'Experience needed must be a string',
    'string.empty': 'Experience needed is required',
    'any.required': 'Experience needed is required'
  }),
  budget: Joi.object({
    currency: Joi.string().required().messages({
      'string.base': 'Currency must be a string',
      'string.empty': 'Currency is required',
      'any.required': 'Currency is required'
    }),
    amount: Joi.string().required().messages({
      'string.base': 'Amount must be a string',
      'string.empty': 'Amount is required',
      'any.required': 'Amount is required'
    })
  }).required().messages({
    'any.required': 'Budget is required'
  }),
  isNdaRequired: Joi.string().required().valid('yes', 'no').messages({
    'string.base': 'NDA requirement must be a string',
    'any.only': 'NDA requirement must be either yes or no',
    'any.required': 'NDA requirement is required'
  }),
  screeningQuestions: Joi.array().optional().allow(null).items(
    Joi.object({
      question: Joi.string().required()
    })
  ).max(10).optional().allow(null).messages({
    'array.base': 'Screening questions must be an array',
    'array.max': 'Maximum 10 screening questions allowed'
  }),
  advancedPreferences: Joi.object({
    englishLevel: Joi.string().optional().allow(null).allow('').messages({
      'string.empty': 'English level is required',
      'any.required': 'English level is required'
    }),
    hireWithin: Joi.string().optional().allow(null).allow('').messages({
      'string.empty': 'Hire within is required',
      'any.required': 'Hire within is required'
    }),
    timeRequirement: Joi.string().optional().allow(null).allow('').messages({
      'string.empty': 'Time requirement is required',
      'any.required': 'Time requirement is required'
    }),
    earnedAmount: Joi.string().optional().allow(null).allow('').messages({
      'string.empty': 'Earned amount is required',
      'any.required': 'Earned amount is required'
    }),
    loccation: Joi.string().optional().allow(null).allow('').messages({
      'string.empty': 'Location is required',
      'any.required': 'Location is required'
    })
  }).required().messages({
    'any.required': 'Advanced preferences are required'
  }),
  status: Joi.string().valid('DRAFT', 'PUBLISHED').optional().default('DRAFT').messages({
    'any.only': 'Status must be either DRAFT or PUBLISHED'
  })
})

// Draft: title, description, category and subcategory required; rest optional
export const saveDraftProjectSchema = Joi.object({
  projectTitle: Joi.string().required().min(1).max(50).messages({
    'string.empty': 'Project title is required',
    'string.min': 'Project title is required',
    'any.required': 'Project title is required'
  }),
  projectDescription: Joi.string().required().min(1).max(3000).messages({
    'string.empty': 'Description is required',
    'string.min': 'Description is required',
    'any.required': 'Description is required'
  }),
  categoryId: Joi.number().integer().positive().required().messages({
    'any.required': 'Category is required'
  }),
  subCategoryId: Joi.number().integer().positive().required().messages({
    'any.required': 'Sub-category is required'
  }),
  projectFiles: Joi.array()
    .items(Joi.object({ url: Joi.string().optional().allow('') }))
    .optional()
    .allow(null),
  scopeOfWork: Joi.string().optional().allow(''),
  skillsRequired: Joi.array().items(Joi.string()).optional().allow(null),
  experienceNeeded: Joi.string().optional().allow(''),
  budget: Joi.object({
    currency: Joi.string().optional().allow(''),
    amount: Joi.string().optional().allow('')
  }).optional(),
  isNdaRequired: Joi.string().optional().allow('', 'yes', 'no'),
  screeningQuestions: Joi.array()
    .items(Joi.object({ question: Joi.string().optional().allow('') }))
    .optional()
    .allow(null),
  advancedPreferences: Joi.object({
    englishLevel: Joi.string().optional().allow(''),
    hireWithin: Joi.string().optional().allow(''),
    timeRequirement: Joi.string().optional().allow(''),
    earnedAmount: Joi.string().optional().allow(''),
    loccation: Joi.string().optional().allow('')
  }).optional(),
  status: Joi.string().optional().allow('', 'DRAFT', 'PUBLISHED')
})

export const updateFounderProjectSchema = Joi.object({
  projectTitle: Joi.string().min(1).max(50).messages({
    'string.base': 'Project title must be a string',
    'string.min': 'Project title is required',
    'string.max': 'Project title is too long (max 50 characters)'
  }),
  projectDescription: Joi.string().min(1).max(3000).messages({
    'string.base': 'Description must be a string',
    'string.max': 'Description is too long (max 3000 characters)'
  }),
  categoryId: Joi.number().integer().positive().messages({
    'number.base': 'Category ID must be a number',
    'number.integer': 'Category ID must be an integer',
    'number.positive': 'Category ID must be positive'
  }),
  subCategoryId: Joi.number().integer().positive().messages({
    'number.base': 'Sub-category ID must be a number',
    'number.integer': 'Sub-category ID must be an integer',
    'number.positive': 'Sub-category ID must be positive'
  }),
  projectFiles: Joi.array().items(
    Joi.object({
      url: Joi.string().required()
    })
  ).optional().allow(null).messages({
    'array.base': 'Project files must be an array'
  }),
  scopeOfWork: Joi.string().optional().allow(''),
  skillsRequired: Joi.array().items(Joi.string()).optional().allow(null),
  experienceNeeded: Joi.string().optional().allow(''),
  budget: Joi.object({
    currency: Joi.string().optional().allow(''),
    amount: Joi.string().optional().allow('')
  }).optional(),
  isNdaRequired: Joi.string().optional().allow('', 'yes', 'no').messages({
    'any.only': 'NDA requirement must be either yes or no'
  }),
  screeningQuestions: Joi.array().items(
    Joi.object({
      question: Joi.string().required()
    })
  ).optional().allow(null),
  advancedPreferences: Joi.object({
    englishLevel: Joi.string().optional().allow(''),
    hireWithin: Joi.string().optional().allow(''),
    timeRequirement: Joi.string().optional().allow(''),
    earnedAmount: Joi.string().optional().allow(''),
    loccation: Joi.string().optional().allow('')
  }).optional(),
  status: Joi.string().optional().allow('', 'DRAFT', 'PUBLISHED').messages({
    'any.only': 'Status must be either DRAFT or PUBLISHED'
  })
})
