"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRouter = void 0;
const express_1 = require("express");
const index_js_1 = require("../../common/config/index.js");
exports.healthRouter = (0, express_1.Router)();
exports.healthRouter.get('/', (_req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        environment: index_js_1.config.NODE_ENV,
        checks: {
            system: 'ok'
        }
    });
});
