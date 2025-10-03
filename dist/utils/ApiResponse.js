"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiResponse = void 0;
class ApiResponse {
    /**
     * Send success response
     */
    static success(res, data, message = 'Success', statusCode = 200) {
        return res.status(statusCode).json({
            success: true,
            message,
            data,
        });
    }
    /**
     * Send error response
     */
    static error(res, message = 'Something went wrong', data = null, statusCode = 400) {
        return res.status(statusCode).json({
            success: false,
            message,
            data,
        });
    }
    /**
     * Send validation error response
     */
    static validationError(res, errors, message = 'Validation failed', statusCode = 400) {
        return res.status(statusCode).json({
            success: false,
            message,
            data: errors,
        });
    }
    /**
     * Send created response (for POST requests)
     */
    static created(res, data, message = 'Resource created successfully') {
        return ApiResponse.success(res, data, message, 201);
    }
    /**
     * Send not found response
     */
    static notFound(res, message = 'Resource not found') {
        return ApiResponse.error(res, message, null, 404);
    }
    /**
     * Send unauthorized response
     */
    static unauthorized(res, message = 'Unauthorized access') {
        return ApiResponse.error(res, message, null, 401);
    }
    /**
     * Send forbidden response
     */
    static forbidden(res, message = 'Access forbidden') {
        return ApiResponse.error(res, message, null, 403);
    }
    /**
     * Send internal server error response
     */
    static serverError(res, message = 'Internal server error') {
        return ApiResponse.error(res, message, null, 500);
    }
    /**
     * Helper method to extract validation errors from Joi ValidationError
     */
    static extractValidationErrors(error) {
        const fieldErrors = {};
        error.details.forEach((detail) => {
            const fieldName = detail.path[0];
            fieldErrors[fieldName] = detail.message;
        });
        return fieldErrors;
    }
    /**
     * Send validation error response from Joi ValidationError
     */
    static joiValidationError(res, error, message = 'Validation failed') {
        const fieldErrors = ApiResponse.extractValidationErrors(error);
        return ApiResponse.validationError(res, fieldErrors, message);
    }
}
exports.ApiResponse = ApiResponse;
