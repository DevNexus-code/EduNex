import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { randomUUID } from 'crypto';
import { config } from './common/config/index.js';
import { errorHandler } from './common/middleware/errorHandler.js';
import { healthRouter } from './modules/health/health.router.js';
import { authRouter } from './modules/auth/auth.router.js';
import { usersRouter } from './modules/users/users.router.js';
import { academicsRouter } from './modules/academics/academics.router.js';
import { studentsRouter } from './modules/students/students.router.js';
import { staffRouter } from './modules/staff/staff.router.js';
import { attendanceRouter } from './modules/attendance/attendance.router.js';
import { leavesRouter } from './modules/leaves/leaves.router.js';
import { feesRouter } from './modules/fees/fees.router.js';
import { examinationsRouter } from './modules/examinations/examinations.router.js';
import { timetableRouter } from './modules/timetable/timetable.router.js';
import { announcementsRouter } from './modules/announcements/announcements.router.js';
import { documentsRouter } from './modules/documents/documents.router.js';
import { reportsRouter } from './modules/reports/reports.router.js';
import { auditRouter } from './modules/audit/audit.router.js';
import { dashboardRouter } from './modules/dashboard/dashboard.router.js';
import { parentsRouter } from './modules/parents/parents.router.js';
import { notificationsRouter } from './modules/notifications/notifications.router.js';

export function createApp(): Express {
  const app = express();

  // 1. Security Headers via Helmet
  app.use(
    helmet({
      contentSecurityPolicy: false
    })
  );

  // 2. Cross-Origin Resource Sharing (Secure LAN & Environment-Aware)
  const configuredOrigins = config.CORS_ORIGIN
    ? config.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
    : [];

  const isAllowedOrigin = (origin: string | undefined): boolean => {
    if (!origin) return true;
    if (configuredOrigins.includes(origin)) return true;
    if (origin === 'http://localhost:5173' || origin === 'http://127.0.0.1:5173' || origin === 'http://localhost:5000') {
      return true;
    }
    if (config.NODE_ENV === 'development') {
      const privateLanRegex = /^http:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$/;
      if (privateLanRegex.test(origin)) {
        return true;
      }
    }
    return false;
  };

  app.use(
    cors({
      origin: (origin, callback) => {
        if (isAllowedOrigin(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`CORS blocked for origin: ${origin}`));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'Accept', 'X-Requested-With']
    })
  );

  // 3. Request Correlation ID
  app.use((req: Request, res: Response, next) => {
    const incomingId = req.headers['x-request-id'];
    const requestId = typeof incomingId === 'string' ? incomingId : randomUUID();
    res.setHeader('X-Request-ID', requestId);
    req.headers['x-request-id'] = requestId;
    next();
  });

  // 4. Body and Cookie Parsers
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(cookieParser());

  // 5. Mount EDUNEX Academic Management API v1 Routes
  app.use('/api/v1/health', healthRouter);
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/users', usersRouter);
  app.use('/api/v1/academics', academicsRouter);
  app.use('/api/v1/students', studentsRouter);
  app.use('/api/v1/parents', parentsRouter);
  app.use('/api/v1/staff', staffRouter);
  app.use('/api/v1/attendance', attendanceRouter);
  app.use('/api/v1/leaves', leavesRouter);
  app.use('/api/v1/fees', feesRouter);
  app.use('/api/v1/examinations', examinationsRouter);
  app.use('/api/v1/timetable', timetableRouter);
  app.use('/api/v1/announcements', announcementsRouter);
  app.use('/api/v1/documents', documentsRouter);
  app.use('/api/v1/reports', reportsRouter);
  app.use('/api/v1/audit-logs', auditRouter);
  app.use('/api/v1/dashboard', dashboardRouter);
  app.use('/api/v1/notifications', notificationsRouter);

  // 6. 404 Catch-All Handler (RFC 7807 Problem Details)
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      type: 'https://api.edunex.internal/errors/not-found',
      title: 'Not Found',
      status: 404,
      detail: `Cannot ${req.method} ${req.originalUrl}`,
      instance: req.originalUrl,
      requestId: res.getHeader('X-Request-ID')
    });
  });

  // 7. Centralized Error Handler (RFC 7807 Problem Details)
  app.use(errorHandler);

  return app;
}
