import Joi from "joi";
import { TaxInformationInput } from "./BillingType";

// Card payment method schema
const cardPaymentMethodSchema = Joi.object({
  paymentType: Joi.string().valid('card').required(),
  cardNumber: Joi.string().creditCard().required().messages({
    'string.creditCard': 'Invalid card number',
    'any.required': 'Card number is required'
  }),
  cardHolderName: Joi.string().min(3).max(100).required().messages({
    'string.min': 'Name must be at least 3 characters',
    'any.required': 'Cardholder name is required'
  }),
  expiryDate: Joi.string().pattern(/^(0[1-9]|1[0-2])\/([0-9]{2})$/).required().messages({
    'string.pattern.base': 'Expiry date must be in MM/YY format',
    'any.required': 'Expiry date is required'
  }),
  cvv: Joi.string().pattern(/^[0-9]{3,4}$/).required().messages({
    'string.pattern.base': 'CVV must be 3 or 4 digits',
    'any.required': 'CVV is required'
  }),
  billingAddress: Joi.object({
    country: Joi.string().required(),
    addressLine1: Joi.string().required(),
    addressLine2: Joi.string().optional().allow(''),
    state: Joi.string().required(),
    city: Joi.string().required(),
    zipCode: Joi.string().required()
  }).required(),
  isDefault: Joi.boolean().optional()
});

// PayPal payment method schema
const paypalPaymentMethodSchema = Joi.object({
  paymentType: Joi.string().valid('paypal').required(),
  paypalEmail: Joi.string().email().required().messages({
    'string.email': 'Invalid PayPal email address',
    'any.required': 'PayPal email is required'
  }),
  paypalAccountId: Joi.string().optional().allow(''),
  isDefault: Joi.boolean().optional()
});

// Combined payment method schema
export const savePaymentMethodSchema = Joi.alternatives().try(
  cardPaymentMethodSchema,
  paypalPaymentMethodSchema
).messages({
  'alternatives.match': 'Invalid payment method type'
});

export const saveTaxInformationSchema = Joi.object<TaxInformationInput>({
  taxResidence: Joi.object({
    country: Joi.string().required(),
    addressLine1: Joi.string().required(),
    addressLine2: Joi.string().optional().allow(''),
    state: Joi.string().required(),
    city: Joi.string().required(),
    zipCode: Joi.string().required()
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
      return helpers.message({ custom: 'Full name is required' });
    }
    if (!value.individualPAN) {
      return helpers.message({ custom: 'Individual PAN number is required' });
    }
    if (value.individualHasGSTIN && !value.individualGSTIN) {
      return helpers.message({ custom: 'Individual GSTIN is required when registered for GST' });
    }
  }

  if (value.activeTab === 'AGENCY') {
    if (!value.agencyName?.trim()) {
      return helpers.message({ custom: 'Company / Agency name is required' });
    }
    if (!value.agencyPAN) {
      return helpers.message({ custom: 'Agency PAN number is required' });
    }
    if (value.agencyHasGSTIN && !value.agencyGSTIN) {
      return helpers.message({ custom: 'Agency GSTIN is required when registered for GST' });
    }
  }

  return value;
});
