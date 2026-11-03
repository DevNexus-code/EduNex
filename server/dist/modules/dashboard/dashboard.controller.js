"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardMetricsController = getDashboardMetricsController;
exports.getOrchestratorMetricsController = getOrchestratorMetricsController;
const dashboard_service_js_1 = require("./dashboard.service.js");
const store_js_1 = require("../../common/db/store.js");
const index_js_1 = require("../../common/errors/index.js");
function getDashboardMetricsController(req, res, next) {
    try {
        if (!req.user)
            throw new index_js_1.UnauthorizedError();
        const metrics = dashboard_service_js_1.dashboardService.getMetrics(req.user);
        res.status(200).json({
            success: true,
            data: metrics
        });
    }
    catch (error) {
        next(error);
    }
}
function getOrchestratorMetricsController(req, res, next) {
    try {
        if (!req.user)
            throw new index_js_1.UnauthorizedError();
        const projectId = req.query.projectId;
        const metrics = store_js_1.store.getOrchestratorMetrics(projectId);
        res.status(200).json({
            success: true,
            data: metrics
        });
    }
    catch (error) {
        next(error);
    }
}
