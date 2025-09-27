import Joi from 'joi';
import { RegisterInput } from './userTypes';

export const registerUserSchema = Joi.object<RegisterInput>({
  FirstName: Joi.string().trim().min(2).max(50).required(),
  LastName: Joi.string().trim().max(50).optional().allow(null, ''),
  email: Joi.string().email().required(),
  phone: Joi.string()
    .pattern(/^[0-9]{7,15}$/)
    .optional()
    .allow(null, ''),
  password: Joi.string().min(6).required()
});
