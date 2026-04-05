import Joi from "joi";
import { TaxInformationInput } from "./TaxInformationType";

export const saveTaxInformationSchema = Joi.object<TaxInformationInput>({
  taxResidence: Joi.object({
    country: Joi.string().required(),
    addressLine1: Joi.string().required(),
    addressLine2: Joi.string().optional().allow(''),
    state: Joi.string().optional().allow(''),
    city: Joi.string().optional().allow(''),
    zipCode: Joi.string().optional().allow('')
  }).required(),
  activeTab: Joi.string().valid('INDIVIDUAL', 'AGENCY').required(),
  name: Joi.string().max(200).required().messages({
    'string.empty': 'Name is required',
    'any.required': 'Name is required'
  }),
  panNumber: Joi.string().pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i).required().messages({
    'string.pattern.base': 'Invalid PAN format (e.g. ABCDE1234F)',
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
});
