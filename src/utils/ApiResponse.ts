import { Response } from 'express';
import { ValidationError } from 'joi';

// Generic service response type that can be reused across all services
export interface ServiceResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

// Type definitions for validation errors
export type ValidationErrors = Record<string, string>;

export interface DetailedFieldError {
  message: string;
  code?: string;
  value?: any;
}

export type DetailedValidationErrors = Record<string, DetailedFieldError>;

export class ApiResponse {
  /**
   * Send success response
   */
  static success<T>(
    res: Response,
    data: T,
    message: string = 'Success',
    statusCode: number = 200
  ): Response {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  /**
   * Send error response
   */
  static error(
    res: Response,
    message: string = 'Something went wrong',
    data: any = null,
    statusCode: number = 400
  ): Response {
    return res.status(statusCode).json({
      success: false,
      message,
      data,
    });
  }

  /**
   * Send validation error response
   */
  static validationError(
    res: Response,
    errors: ValidationErrors,
    message: string = 'Validation failed',
    statusCode: number = 400
  ): Response {
    return res.status(statusCode).json({
      success: false,
      message,
      data: errors,
    });
  }

  /**
   * Send created response (for POST requests)
   */
  static created<T>(
    res: Response,
    data: T,
    message: string = 'Resource created successfully'
  ): Response {
    return ApiResponse.success(res, data, message, 201);
  }

  /**
   * Send not found response
   */
  static notFound(
    res: Response,
    message: string = 'Resource not found'
  ): Response {
    return ApiResponse.error(res, message, null, 404);
  }

  /**
   * Send unauthorized response
   */
  static unauthorized(
    res: Response,
    message: string = 'Unauthorized access'
  ): Response {
    return ApiResponse.error(res, message, null, 401);
  }

  /**
   * Send forbidden response
   */
  static forbidden(
    res: Response,
    message: string = 'Access forbidden'
  ): Response {
    return ApiResponse.error(res, message, null, 403);
  }

  /**
   * Send internal server error response
   */
  static serverError(
    res: Response,
    message: string = 'Internal server error'
  ): Response {
    return ApiResponse.error(res, message, null, 500);
  }

  /**
   * Helper method to extract validation errors from Joi ValidationError
   */
  static extractValidationErrors(error: ValidationError): Record<string, string> {
    const fieldErrors: Record<string, string> = {};
    error.details.forEach((detail) => {
      const fieldName = detail.path[0] as string;
      fieldErrors[fieldName] = detail.message;
    });
    return fieldErrors;
  }

  /**
   * Send validation error response from Joi ValidationError
   */
  static joiValidationError(
    res: Response,
    error: ValidationError,
    message: string = 'Validation failed'
  ): Response {
    const fieldErrors = ApiResponse.extractValidationErrors(error);
    return ApiResponse.validationError(res, fieldErrors, message);
  }
}
