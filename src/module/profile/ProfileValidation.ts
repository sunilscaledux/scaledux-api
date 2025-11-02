import Joi from "joi";
import { ProfileSummaryInput, PersonalInfoInput, HourlyRateInput } from "./ProfileType";

export const updateSummarySchema = Joi.object<ProfileSummaryInput>({
  title: Joi.string().required(),
  about: Joi.string().required(),
});

export const updatePersonalInfoSchema = Joi.object<PersonalInfoInput>({
  address: Joi.string().optional(),
  address_line_2: Joi.string().optional(),
  zipCode: Joi.string().optional(),
  countryId: Joi.number().integer().optional(),
  stateId: Joi.number().integer().optional(),
  city: Joi.string().optional(),
  website: Joi.string().uri().optional(),
  hideEmail: Joi.boolean().optional(),
  hidePhone: Joi.boolean().optional(),
  links: Joi.array().items(
    Joi.object({
      platform: Joi.string().required(),
      url: Joi.string().uri().required()
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