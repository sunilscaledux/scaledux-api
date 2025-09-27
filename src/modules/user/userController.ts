import { Request, Response } from 'express';
import { registerUser } from './userService';
import { RegisterInput } from './userTypes';
import { registerUserSchema } from './userValidation';
import { ApiResponse } from '@utils/ApiResponse';

export async function register(req: Request, res: Response) {
  const bodyToValidate = req.body || {};
  
  const { error, value } = registerUserSchema.validate(bodyToValidate, {
    abortEarly: false,
  });
  if (error) {
    return ApiResponse.joiValidationError(res, error);
  }
  
  try {
    const body: RegisterInput = value;
    const user = await registerUser(body);
    return ApiResponse.created(res, user, 'User registered successfully');
  } catch (err: any) {
    return ApiResponse.error(res, err.message);
  }
}
