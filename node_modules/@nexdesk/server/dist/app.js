"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const crypto_1 = require("crypto");
const index_js_1 = require("./common/config/index.js");
const errorHandler_js_1 = require("./common/middleware/errorHandler.js");
const health_router_js_1 = require("./modules/health/health.router.js");
const auth_router_js_1 = require("./modules/auth/auth.router.js");
const users_router_js_1 = require("./modules/users/users.router.js");
const academics_router_js_1 = require("./modules/academics/academics.router.js");
const students_router_js_1 = require("./modules/students/students.router.js");
const staff_router_js_1 = require("./modules/staff/staff.router.js");
const attendance_router_js_1 = require("./modules/attendance/attendance.router.js");
const leaves_router_js_1 = require("./modules/leaves/leaves.router.js");
const fees_router_js_1 = require("./modules/fees/fees.router.js");
const examinations_router_js_1 = require("./modules/examinations/examinations.router.js");
const timetable_router_js_1 = require("./modules/timetable/timetable.router.js");
const announcements_router_js_1 = require("./modules/announcements/announcements.router.js");
const documents_router_js_1 = require("./modules/documents/documents.router.js");
const reports_router_js_1 = require("./modules/reports/reports.router.js");
const audit_router_js_1 = require("./modules/audit/audit.router.js");
const dashboard_router_js_1 = require("./modules/dashboard/dashboard.router.js");
const parents_router_js_1 = require("./modules/parents/parents.router.js");
const notifications_router_js_1 = require("./modules/notifications/notifications.router.js");
function createApp() {
    const app = (0, express_1.default)();
    // 1. Security Headers via Helmet
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: false
    }));
    // 2. Cross-Origin Resource Sharing (Secure LAN & Environment-Aware)
    const configuredOrigins = index_js_1.config.CORS_ORIGIN
        ? index_js_1.config.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
        : [];
    const isAllowedOrigin = (origin) => {
        if (!origin)
            return true;
        if (configuredOrigins.includes(origin))
            return true;
        if (origin === 'http://localhost:5173' || origin === 'http://127.0.0.1:5173' || origin === 'http://localhost:5000') {
            return true;
        }
        if (index_js_1.config.NODE_ENV === 'development') {
            const privateLanRegex = /^http:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$/;
            if (privateLanRegex.test(origin)) {
                return true;
            }
        }
        return false;
    };
    app.use((0, cors_1.default)({
        origin: (origin, callback) => {
            if (isAllowedOrigin(origin)) {
                callback(null, true);
            }
            else {
                callback(new Error(`CORS blocked for origin: ${origin}`));
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'Accept', 'X-Requested-With']
    }));
    // 3. Request Correlation ID
    app.use((req, res, next) => {
        const incomingId = req.headers['x-request-id'];
        const requestId = typeof incomingId === 'string' ? incomingId : (0, crypto_1.randomUUID)();
        res.setHeader('X-Request-ID', requestId);
        req.headers['x-request-id'] = requestId;
        next();
    });
    // 4. Body and Cookie Parsers
    app.use(express_1.default.json({ limit: '2mb' }));
    app.use(express_1.default.urlencoded({ extended: true, limit: '2mb' }));
    app.use((0, cookie_parser_1.default)());
    // 5. Mount EDUNEX Academic Management API v1 Routes
    app.use('/api/v1/health', health_router_js_1.healthRouter);
    app.use('/api/v1/auth', auth_router_js_1.authRouter);
    app.use('/api/v1/users', users_router_js_1.usersRouter);
    app.use('/api/v1/academics', academics_router_js_1.academicsRouter);
    app.use('/api/v1/students', students_router_js_1.studentsRouter);
    app.use('/api/v1/parents', parents_router_js_1.parentsRouter);
    app.use('/api/v1/staff', staff_router_js_1.staffRouter);
    app.use('/api/v1/attendance', attendance_router_js_1.attendanceRouter);
    app.use('/api/v1/leaves', leaves_router_js_1.leavesRouter);
    app.use('/api/v1/fees', fees_router_js_1.feesRouter);
    app.use('/api/v1/examinations', examinations_router_js_1.examinationsRouter);
    app.use('/api/v1/timetable', timetable_router_js_1.timetableRouter);
    app.use('/api/v1/announcements', announcements_router_js_1.announcementsRouter);
    app.use('/api/v1/documents', documents_router_js_1.documentsRouter);
    app.use('/api/v1/reports', reports_router_js_1.reportsRouter);
    app.use('/api/v1/audit-logs', audit_router_js_1.auditRouter);
    app.use('/api/v1/dashboard', dashboard_router_js_1.dashboardRouter);
    app.use('/api/v1/notifications', notifications_router_js_1.notificationsRouter);
    // 6. 404 Catch-All Handler (RFC 7807 Problem Details)
    app.use((req, res) => {
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
    app.use(errorHandler_js_1.errorHandler);
    return app;
}
