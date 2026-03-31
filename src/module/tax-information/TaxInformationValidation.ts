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
  individualName: Joi.string().max(200).optional().allow(''),
  individualPAN: Joi.string().pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i).optional().allow(''),
  individualHasGSTIN: Joi.boolean().required(),
  individualGSTIN: Joi.string().pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i).optional().allow(''),
  individualGSTConsent: Joi.boolean().optional(),
  agencyName: Joi.string().max(200).optional().allow(''),
  agencyPAN: Joi.string().pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i).optional().allow(''),
  agencyHasGSTIN: Joi.boolean().required(),
  agencyGSTIN: Joi.string().pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i).optional().allow(''),
  agencyGSTConsent: Joi.boolean().optional()
}).custom((value, helpers) => {
  if (value.activeTab === 'INDIVIDUAL') {
    if (!value.individualName?.trim()) {
      return helpers.message({ custom: 'Full name is required' } as any);
    }
    if (!value.individualPAN) {
      return helpers.message({ custom: 'Individual PAN number is required' } as any);
    }
    if (value.individualHasGSTIN && !value.individualGSTIN) {
      return helpers.message({ custom: 'Individual GSTIN is required when registered for GST' } as any);
    }
  }

  if (value.activeTab === 'AGENCY') {
    if (!value.agencyName?.trim()) {
      return helpers.message({ custom: 'Company / Agency name is required' } as any);
    }
    if (!value.agencyPAN) {
      return helpers.message({ custom: 'Agency PAN number is required' } as any);
    }
    if (value.agencyHasGSTIN && !value.agencyGSTIN) {
      return helpers.message({ custom: 'Agency GSTIN is required when registered for GST' } as any);
    }
  }

  return value;
});
