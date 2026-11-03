import pino from 'pino';
import { config } from '../config/index.js';

export const logger = pino({
  level: config.LOG_LEVEL || 'info',
  redact: {
    paths: [
      'req.headers.cookie',
      'req.headers.authorization',
      'headers.cookie',
      'headers.authorization',
      '*.password',
      '*.passwordHash',
      '*.token',
      '*.sessionToken',
      '*.sessionTokenHash',
      '*.secret'
    ],
    censor: '[REDACTED]'
  },
  transport:
    config.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname'
          }
        }
      : undefined
});
