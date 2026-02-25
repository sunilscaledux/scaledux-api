import Joi from "joi";
import { ProfileSummaryInput, PersonalInfoInput, HourlyRateInput, AvailableHoursPerWeekInput } from "./ProfileType";

export const updateSummarySchema = Joi.object<ProfileSummaryInput>({
  title: Joi.string().required(),
  about: Joi.string().required(),
});

export const updatePersonalInfoSchema = Joi.object<PersonalInfoInput>({
  address: Joi.string().optional(),
  address_line_2: Joi.string().optional(),
  zipCode: Joi.string().optional(),
  countryId: Joi.number().integer().optional(),
  stateId: Joi.number().integer().optional().allow(null),
  city: Joi.string().optional(),
  website: Joi.string().optional().allow('').custom((value, helpers) => {
    if (!value || value.trim() === '') return value;
    
    // Reject if URL contains http:// or https://
    if (/^https?:\/\//i.test(value)) {
      throw new Error('Please enter website without http:// or https://');
    }
    
    // Validate domain format
    if (!/^(www\.)?[a-zA-Z0-9-]+(\.[a-zA-Z]{2,})+$/.test(value)) {
      throw new Error('Invalid website format. Eg scaledux.com or www.scaledux.com');
    }
    
    // Add https:// prefix for storage
    return `https://${value}`;
  }),
  hideEmail: Joi.boolean().optional(),
  hidePhone: Joi.boolean().optional(),
  links: Joi.array().items(
    Joi.object({
      platform: Joi.string().required(),
      url: Joi.string().required().custom((value, helpers) => {
        // Allow URLs with or without protocol
        if (!value || value.trim() === '') {
          throw new Error('URL is required');
        }
        
        // Add https:// if not present
        const urlWithProtocol = value.startsWith('http://') || value.startsWith('https://') 
          ? value 
          : `https://${value}`;
        
        // Basic URL validation
        try {
          new URL(urlWithProtocol);
          return urlWithProtocol;
        } catch (e) {
          throw new Error('Invalid URL format');
        }
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