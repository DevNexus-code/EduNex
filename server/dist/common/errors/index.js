"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryValidationError = exports.BadRequestError = exports.ConflictError = exports.ValidationError = exports.ForbiddenError = exports.UnauthorizedError = exports.NotFoundError = exports.AppError = void 0;
class AppError extends Error {
    statusCode;
    errorType;
    isOperational;
    invalidParams;
    constructor(message, statusCode = 500, errorType = 'https://api.edunex.internal/errors/internal-error', invalidParams) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.errorType = errorType;
        this.isOperational = true;
        this.invalidParams = invalidParams;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(message, 404, 'https://api.edunex.internal/errors/not-found');
    }
}
exports.NotFoundError = NotFoundError;
class UnauthorizedError extends AppError {
    constructor(message = 'Authentication required') {
        super(message, 401, 'https://api.edunex.internal/errors/unauthorized');
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends AppError {
    constructor(message = 'You do not have permission to perform this action') {
        super(message, 403, 'https://api.edunex.internal/errors/forbidden');
    }
}
exports.ForbiddenError = ForbiddenError;
class ValidationError extends AppError {
    constructor(message, invalidParams) {
        super(message, 422, 'https://api.edunex.internal/errors/validation-failed', invalidParams);
    }
}
exports.ValidationError = ValidationError;
class ConflictError extends AppError {
    constructor(message) {
        super(message, 409, 'https://api.edunex.internal/errors/conflict');
    }
}
exports.ConflictError = ConflictError;
class BadRequestError extends AppError {
    constructor(message = 'Bad request') {
        super(message, 400, 'https://api.edunex.internal/errors/bad-request');
    }
}
exports.BadRequestError = BadRequestError;
class QueryValidationError extends AppError {
    field;
    constructor(message, field) {
        super(message, 400, 'https://api.edunex.internal/errors/bad-request', field ? [{ name: field, reason: message }] : undefined);
        this.name = 'QueryValidationError';
        this.field = field;
    }
}
exports.QueryValidationError = QueryValidationError;
