import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/index.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = res.getHeader('X-Request-ID') || req.headers['x-request-id'];

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err, requestId, path: req.path }, err.message);
    } else {
      logger.warn({ statusCode: err.statusCode, requestId, path: req.path }, err.message);
    }

    const payload: Record<string, any> = {
      success: false,
      message: err.message,
      type: err.errorType,
      title: err.name,
      status: err.statusCode,
      detail: err.message,
      instance: req.originalUrl,
      requestId,
      invalidParams: err.invalidParams
    };

    if ((err as any).field) {
      payload.field = (err as any).field;
    }

    res.status(err.statusCode).json(payload);
    return;
  }

  // Unhandled exception
  logger.error({ err, requestId, path: req.path }, 'Unhandled server exception');
  res.status(500).json({
    success: false,
    message: config.NODE_ENV === 'production' ? 'An unexpected internal error occurred.' : err.message,
    type: 'https://api.edunex.internal/errors/internal-error',
    title: 'Internal Server Error',
    status: 500,
    detail: config.NODE_ENV === 'production' ? 'An unexpected internal error occurred.' : err.message,
    instance: req.originalUrl,
    requestId
  });
}
