"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRateLimiter = createRateLimiter;
const index_js_1 = require("../errors/index.js");
const index_js_2 = require("../config/index.js");
function createRateLimiter(options) {
    // Disable in automated test environment to allow rapid concurrent integration test suites
    if (index_js_2.config.NODE_ENV === 'test') {
        return (_req, _res, next) => next();
    }
    const ipMap = new Map();
    return (req, res, next) => {
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
        const now = Date.now();
        const record = ipMap.get(ip);
        if (!record || now > record.resetAt) {
            ipMap.set(ip, { count: 1, resetAt: now + options.windowMs });
            return next();
        }
        if (record.count >= options.maxRequests) {
            const retryAfterSeconds = Math.ceil((record.resetAt - now) / 1000);
            res.setHeader('Retry-After', retryAfterSeconds);
            return next(new index_js_1.AppError('Too many requests. Please try again after a brief pause.', 429, 'https://api.nexdesk.internal/errors/rate-limit-exceeded'));
        }
        record.count += 1;
        next();
    };
}
