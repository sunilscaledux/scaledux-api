import Joi from "joi";

export const createUserExpertiseSchema = Joi.object({
  expertise_category_id: Joi.number().integer().positive().required().messages({
    'number.base': 'Expertise category ID must be a number',
    'number.integer': 'Expertise category ID must be an integer',
    'number.positive': 'Expertise category ID must be positive',
    'any.required': 'Expertise category is required'
  }),
  specialty_ids: Joi.array().items(
    Joi.number().integer().positive().messages({
      'number.base': 'Each specialty ID must be a number',
      'number.integer': 'Each specialty ID must be an integer',
      'number.positive': 'Each specialty ID must be positive'
    })
  ).min(1).required().messages({
    'array.base': 'Specialty IDs must be an array',
    'array.min': 'At least one specialty is required',
    'any.required': 'Specialty is required'
  }),
  description: Joi.string().max(1000).optional().allow('').messages({
    'string.base': 'Description must be a string',
    'string.max': 'Description cannot exceed 1000 characters'
  }),
  skills: Joi.array().items(Joi.string().trim().min(1).max(100)).max(20).optional().messages({
    'array.base': 'Skills must be an array',
    'array.max': 'Cannot have more than 20 skills',
    'string.base': 'Each skill must be a string',
    'string.min': 'Skill name cannot be empty',
    'string.max': 'Skill name cannot exceed 100 characters'
  })
});

export const updateUserExpertiseSchema = createUserExpertiseSchema.keys({
  id: Joi.number().integer().positive().required().messages({
    'number.base': 'ID must be a number',
    'number.integer': 'ID must be an integer',
    'number.positive': 'ID must be positive',
    'any.required': 'ID is required'
  })
});
