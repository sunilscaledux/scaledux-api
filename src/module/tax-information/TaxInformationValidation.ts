import Joi from "joi";
import { TaxInformationInput } from "./TaxInformationType";

// Allowed characters for street addresses: letters, numbers, spaces and , . - / #
const ADDRESS_LINE_PATTERN = /^[A-Za-z0-9 ,.\-\/#]*$/;
// City: letters and spaces only
const CITY_PATTERN = /^[A-Za-z ]+$/;
// Individual full name: letters and spaces only
const FULL_NAME_PATTERN = /^[A-Za-z ]+$/;
// Agency / company name: letters, numbers and spaces
const COMPANY_NAME_PATTERN = /^[A-Za-z0-9 ]+$/;

export const saveTaxInformationSchema = Joi.object<TaxInformationInput>({
  taxResidence: Joi.object({
    country: Joi.string().required(),
    addressLine1: Joi.string().required().pattern(ADDRESS_LINE_PATTERN).messages({
      'string.pattern.base': 'Address line 1 can only contain letters, numbers and , . - / #'
    }),
    addressLine2: Joi.string().optional().allow('').pattern(ADDRESS_LINE_PATTERN).messages({
      'string.pattern.base': 'Address line 2 can only contain letters, numbers and , . - / #'
    }),
    state: Joi.string().optional().allow(''),
    city: Joi.string().optional().allow('').pattern(CITY_PATTERN).messages({
      'string.pattern.base': 'City can only contain letters and spaces'
    }),
    zipCode: Joi.string().optional().allow('')
  }).required(),
  activeTab: Joi.string().valid('INDIVIDUAL', 'AGENCY').required(),
  name: Joi.string().max(200).required().messages({
    'string.empty': 'Name is required',
    'any.required': 'Name is required'
  }),
  panNumber: Joi.string().pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i).required().messages({
    'string.pattern.base': 'PAN must be 10 characters (e.g. ABCDE1234F). No special characters.',
    'any.required': 'PAN number is required'
  }),
  hasGSTIN: Joi.boolean().required(),
  gstin: Joi.when('hasGSTIN', {
    is: true,
    then: Joi.string().pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i).required().messages({
      'string.pattern.base': 'Invalid GSTIN format',
      'any.required': 'GSTIN is required when registered for GST'
    }),
    otherwise: Joi.string().optional().allow('')
  }),
  gstConsent: Joi.boolean().optional()
})
  // Entity-specific name rules: INDIVIDUAL = letters only, AGENCY = letters + digits.
  .custom((value, helpers) => {
    const pattern = value.activeTab === 'AGENCY' ? COMPANY_NAME_PATTERN : FULL_NAME_PATTERN;
    if (value.name && !pattern.test(value.name)) {
      return helpers.error('any.invalid', {
        message:
          value.activeTab === 'AGENCY'
            ? 'Company name can only contain letters, numbers and spaces'
            : 'Full name can only contain letters and spaces'
      });
    }
    return value;
  })
  .messages({
    'any.invalid': '{{#message}}'
  });
