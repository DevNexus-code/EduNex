"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const index_js_1 = require("../errors/index.js");
const logger_js_1 = require("../utils/logger.js");
const index_js_2 = require("../config/index.js");
function errorHandler(err, req, res, _next) {
    const requestId = res.getHeader('X-Request-ID') || req.headers['x-request-id'];
    if (err instanceof index_js_1.AppError) {
        if (err.statusCode >= 500) {
            logger_js_1.logger.error({ err, requestId, path: req.path }, err.message);
        }
        else {
            logger_js_1.logger.warn({ statusCode: err.statusCode, requestId, path: req.path }, err.message);
        }
        const payload = {
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
        if (err.field) {
            payload.field = err.field;
        }
        res.status(err.statusCode).json(payload);
        return;
    }
    // Unhandled exception
    logger_js_1.logger.error({ err, requestId, path: req.path }, 'Unhandled server exception');
    res.status(500).json({
        success: false,
        message: index_js_2.config.NODE_ENV === 'production' ? 'An unexpected internal error occurred.' : err.message,
        type: 'https://api.edunex.internal/errors/internal-error',
        title: 'Internal Server Error',
        status: 500,
        detail: index_js_2.config.NODE_ENV === 'production' ? 'An unexpected internal error occurred.' : err.message,
        instance: req.originalUrl,
        requestId
    });
}
