import Joi from "joi";

export const createBankInformationSchema = Joi.object({
  entityType: Joi.string().valid('INDIVIDUAL', 'AGENCY').default('INDIVIDUAL'),
  displayLabel: Joi.string().max(255).required(),
  bankName: Joi.string().max(100).optional().allow(''),
  accountNumber: Joi.string().required().messages({
    'any.required': 'Bank account number is required'
  }),
  accountHolderName: Joi.string().max(200).optional().allow(''),
  ifsc: Joi.string().pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/i).required().messages({
    'string.pattern.base': 'Valid IFSC is required (e.g. HDFC0001234)',
    'any.required': 'IFSC code is required'
  }),
});

export const updateBankInformationSchema = Joi.object({
  displayLabel: Joi.string().max(255).optional(),
  bankName: Joi.string().max(100).optional().allow(''),
  accountNumber: Joi.string().optional(),
  accountHolderName: Joi.string().max(200).optional().allow(''),
  ifsc: Joi.string().pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/i).optional().messages({
    'string.pattern.base': 'Valid IFSC is required (e.g. HDFC0001234)'
  }),
});
