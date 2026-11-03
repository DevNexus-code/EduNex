import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/index.js';
import { config } from '../config/index.js';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

export function createRateLimiter(options: { maxRequests: number; windowMs: number }) {
  // Disable in automated test environment to allow rapid concurrent integration test suites
  if (config.NODE_ENV === 'test') {
    return (_req: Request, _res: Response, next: NextFunction): void => next();
  }

  const ipMap = new Map<string, RateLimitRecord>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const now = Date.now();
    const record = ipMap.get(ip);

    if (!record || now > record.resetAt) {
      ipMap.set(ip, { count: 1, resetAt: now + options.windowMs });
      return next();
    }

    if (record.count >= options.maxRequests) {
      const retryAfterSeconds = Math.ceil((record.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      return next(
        new AppError(
          'Too many requests. Please try again after a brief pause.',
          429,
          'https://api.nexdesk.internal/errors/rate-limit-exceeded'
        )
      );
    }

    record.count += 1;
    next();
  };
}
