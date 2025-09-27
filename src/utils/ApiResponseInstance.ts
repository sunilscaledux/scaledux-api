import { Response } from 'express';
import { ValidationError } from 'joi';

export interface ApiResponseFormat<T = any> {
  success: boolean;
  message: string;
  data: T | null;
}

export class ApiResponseInstance {
  constructor(private res: Response) {}

  /**
   * Send success response
   */
  success<T>(
    data: T,
    message: string = 'Success',
    statusCode: number = 200
  ): Response {
    return this.res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  /**
   * Send error response
   */
  error(
    message: string = 'Something went wrong',
    data: any = null,
    statusCode: number = 400
  ): Response {
    return this.res.status(statusCode).json({
      success: false,
      message,
      data,
    });
  }

  /**
   * Send validation error response
   */
  validationError(
    errors: Record<string, string>,
    message: string = 'Validation failed',
    statusCode: number = 400
  ): Response {
    return this.res.status(statusCode).json({
      success: false,
      message,
      data: errors,
    });
  }

  /**
   * Send created response (for POST requests)
   */
  created<T>(
    data: T,
    message: string = 'Resource created successfully'
  ): Response {
    return this.success(data, message, 201);
  }

  /**
   * Send validation error response from Joi ValidationError
   */
  joiValidationError(
    error: ValidationError,
    message: string = 'Validation failed'
  ): Response {
    const fieldErrors: Record<string, string> = {};
    error.details.forEach((detail) => {
      const fieldName = detail.path[0] as string;
      fieldErrors[fieldName] = detail.message;
    });
    return this.validationError(fieldErrors, message);
  }
}
