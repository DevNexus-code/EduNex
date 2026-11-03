"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.agentsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const store_js_1 = require("../../common/db/store.js");
const auth_js_1 = require("../../common/middleware/auth.js");
const validateRequest_js_1 = require("../../common/middleware/validateRequest.js");
const client_1 = require("@prisma/client");
const index_js_1 = require("../../common/errors/index.js");
exports.agentsRouter = (0, express_1.Router)();
const updateAgentSchema = zod_1.z.object({
    systemPrompt: zod_1.z.string().min(10).optional(),
    temperature: zod_1.z.number().min(0).max(1).optional(),
    maxTokens: zod_1.z.number().min(256).max(32768).optional(),
    modelProvider: zod_1.z.string().min(2).optional()
});
exports.agentsRouter.get('/', auth_js_1.authenticate, (req, res) => {
    const configs = store_js_1.store.getAgentConfigs().map((cfg) => {
        const executionsCount = store_js_1.store.pipelineStages.filter((s) => s.agentRole === cfg.role && s.status === 'PASSED').length;
        const isRunning = store_js_1.store.pipelineStages.some((s) => s.agentRole === cfg.role && s.status === 'RUNNING');
        return {
            ...cfg,
            executionsCount,
            status: isRunning ? 'BUSY' : 'IDLE'
        };
    });
    res.status(200).json({
        success: true,
        data: configs
    });
});
exports.agentsRouter.patch('/:role', auth_js_1.authenticate, (0, auth_js_1.requireRole)([client_1.Role.ADMIN, client_1.Role.TEAM_LEAD]), (0, validateRequest_js_1.validateRequest)({ body: updateAgentSchema }), (req, res, next) => {
    const roleParam = Array.isArray(req.params.role) ? req.params.role[0] : req.params.role;
    const role = roleParam;
    const updated = store_js_1.store.updateAgentConfig(role, req.body);
    if (!updated) {
        return next(new index_js_1.NotFoundError(`Agent with role '${roleParam}' not found.`));
    }
    store_js_1.store.logAction('AGENT_CONFIG_UPDATED', 'AgentConfig', updated.id, req.user.id, {
        role,
        newVersion: updated.version
    });
    res.status(200).json({
        success: true,
        data: updated
    });
});
