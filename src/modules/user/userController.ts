import { Request, Response } from 'express';
import { registerUser } from './userService';
import { RegisterInput } from './userTypes';
import { registerUserSchema } from './userValidation';

export async function register(req: Request, res: Response) {

   const { error, value } = registerUserSchema.validate(req.body, {
    abortEarly: false,
  });
   
    if (error) {
    return res.status(400).json({
      status: 'error',
      errors: error.details.map((d) => d.message),
    });
  }
  
  try {
    const body: RegisterInput = req.body;
    const user = await registerUser(body);
    res.status(201).json({ success: true, user });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}
