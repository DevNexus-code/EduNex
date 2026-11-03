export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorType: string;
  public readonly isOperational: boolean;
  public readonly invalidParams?: Array<{ name: string; reason: string }>;

  constructor(
    message: string,
    statusCode = 500,
    errorType = 'https://api.edunex.internal/errors/internal-error',
    invalidParams?: Array<{ name: string; reason: string }>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorType = errorType;
    this.isOperational = true;
    this.invalidParams = invalidParams;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'https://api.edunex.internal/errors/not-found');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'https://api.edunex.internal/errors/unauthorized');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, 403, 'https://api.edunex.internal/errors/forbidden');
  }
}

export class ValidationError extends AppError {
  constructor(message: string, invalidParams?: Array<{ name: string; reason: string }>) {
    super(message, 422, 'https://api.edunex.internal/errors/validation-failed', invalidParams);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'https://api.edunex.internal/errors/conflict');
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request') {
    super(message, 400, 'https://api.edunex.internal/errors/bad-request');
  }
}

export class QueryValidationError extends AppError {
  public readonly field?: string;

  constructor(message: string, field?: string) {
    super(
      message,
      400,
      'https://api.edunex.internal/errors/bad-request',
      field ? [{ name: field, reason: message }] : undefined
    );
    this.name = 'QueryValidationError';
    this.field = field;
  }
}
