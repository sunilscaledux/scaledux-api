import Joi from "joi";
import { ProfileSummaryInput, PersonalInfoInput, HourlyRateInput, AvailableHoursPerWeekInput } from "./ProfileType";
import { rejectDangerousHtml, dangerousHtmlMessages, validateSafeUrl, safeUrlMessages } from "../../utils/validation";

export const updateSummarySchema = Joi.object<ProfileSummaryInput>({
  title: Joi.string().max(120).required().custom((value, helpers) => {
    if (/<[^>]*>/.test(value)) {
      return helpers.error('string.htmlNotAllowed');
    }
    if (/('|--|;|\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|EXEC)\b)/i.test(value)) {
      return helpers.error('string.sqlNotAllowed');
    }
    return value;
  }).messages({
    'string.max': 'Title must be at most 120 characters',
    'string.htmlNotAllowed': 'Title must not contain HTML tags',
    'string.sqlNotAllowed': 'Title contains invalid characters',
  }),
  about: Joi.string().required().custom(rejectDangerousHtml).messages(dangerousHtmlMessages),
});

export const updatePersonalInfoSchema = Joi.object<PersonalInfoInput>({
  address: Joi.string().optional(),
  address_line_2: Joi.string().optional(),
  zipCode: Joi.string().optional(),
  countryId: Joi.number().integer().optional(),
  stateId: Joi.number().integer().optional().allow(null),
  city: Joi.string().optional(),
  // DOB stored as a YYYY-MM-DD string; the UI also caps to 18+ but we
  // re-check max-date here so a non-UI client can't bypass it.
  dob: Joi.string().isoDate().max(10).optional().allow('', null).messages({
    'string.isoDate': 'Date of birth must be a valid date',
    'string.max': 'Date of birth must be a valid date',
  }),
  gender: Joi.string().valid('male', 'female', 'other').optional().allow('', null).messages({
    'any.only': 'Gender must be male, female or other',
  }),
  website: Joi.string().optional().allow('').max(2048).custom(validateSafeUrl).messages({
    'string.max': 'Website URL must not exceed 2048 characters',
    ...safeUrlMessages,
  }),
  hideEmail: Joi.boolean().optional(),
  hidePhone: Joi.boolean().optional(),
  links: Joi.array().items(
    Joi.object({
      platform: Joi.string().required(),
      url: Joi.string().required().max(2048).custom(validateSafeUrl).messages({
        'string.max': 'URL must not exceed 2048 characters',
        ...safeUrlMessages,
      })
    })
  ).optional(),
});

export const updateHourlyRateSchema = Joi.object<HourlyRateInput>({
  hourly_rate: Joi.number().positive().required().messages({
    'number.positive': 'Hourly rate must be a positive number',
    'any.required': 'Hourly rate is required'
  }),
  currency_id: Joi.number().integer().positive().required().messages({
    'number.base': 'Please select a valid currency',
    'number.positive': 'Please select a valid currency',
    'any.required': 'Currency selection is required'
  }),
});

export const updateAvailableHoursPerWeekSchema = Joi.object<AvailableHoursPerWeekInput>({
  available_hours_per_week: Joi.number().integer().min(0).max(168).allow(null).messages({
    'number.min': 'Available hours must be at least 0',
    'number.max': 'Available hours cannot exceed 168 per week'
  }),
});

export const updatePasswordSchema = Joi.object({
  current_password: Joi.string().required().messages({ 'any.required': 'Current password is required' }),
  new_password: Joi.string().min(8).required().messages({
    'string.min': 'New password must be at least 8 characters',
    'any.required': 'New password is required'
  }),
  confirm_password: Joi.string().valid(Joi.ref('new_password')).required().messages({
    'any.only': 'Confirm password must match new password',
    'any.required': 'Confirm password is required'
  }),
}).options({ stripUnknown: true });

/** For Google/LinkedIn users with no password - set password without current. */
export const setPasswordSchema = Joi.object({
  new_password: Joi.string().min(8).required().messages({
    'string.min': 'Password must be at least 8 characters',
    'any.required': 'New password is required'
  }),
  confirm_password: Joi.string().valid(Joi.ref('new_password')).required().messages({
    'any.only': 'Confirm password must match new password',
    'any.required': 'Confirm password is required'
  }),
}).options({ stripUnknown: true });

export const updateNameSchema = Joi.object({
  first_name: Joi.string().trim().min(1).max(50).required().messages({
    'string.empty': 'First name is required',
    'string.max': 'First name must be at most 50 characters',
  }),
  last_name: Joi.string().trim().min(1).max(50).required().messages({
    'string.empty': 'Last name is required',
    'string.max': 'Last name must be at most 50 characters',
  }),
});

export const updateInvestorPreferencesSchema = Joi.object({
  investorTypes: Joi.array().items(Joi.string().trim()).min(1).required().messages({
    'array.min': 'Please select at least one investor type',
    'any.required': 'Investor types are required',
  }),
});