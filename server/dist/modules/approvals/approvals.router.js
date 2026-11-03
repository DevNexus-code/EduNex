"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.approvalsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const store_js_1 = require("../../common/db/store.js");
const pipeline_service_js_1 = require("../pipelines/pipeline.service.js");
const auth_js_1 = require("../../common/middleware/auth.js");
const validateRequest_js_1 = require("../../common/middleware/validateRequest.js");
const client_1 = require("@prisma/client");
exports.approvalsRouter = (0, express_1.Router)();
const decisionSchema = zod_1.z.object({
    status: zod_1.z.enum(['APPROVED', 'REJECTED']),
    notes: zod_1.z.string().max(1000).optional()
});
exports.approvalsRouter.get('/', auth_js_1.authenticate, (req, res) => {
    const status = req.query.status;
    const projectId = req.query.projectId;
    const approvals = store_js_1.store.getApprovals(status, projectId).map((appr) => {
        const run = store_js_1.store.findPipelineRunById(appr.pipelineRunId);
        const project = run ? store_js_1.store.findProjectById(run.projectId) : null;
        const stage = appr.pipelineStageId ? store_js_1.store.findStageById(appr.pipelineStageId) : null;
        const reviewer = appr.reviewerId ? store_js_1.store.findUserById(appr.reviewerId) : null;
        return {
            ...appr,
            project,
            run,
            stage,
            reviewer: reviewer ? { id: reviewer.id, name: `${reviewer.firstName} ${reviewer.lastName}`, email: reviewer.email } : null
        };
    });
    res.status(200).json({
        success: true,
        data: approvals
    });
});
exports.approvalsRouter.post('/:id/decision', auth_js_1.authenticate, (0, auth_js_1.requireRole)([client_1.Role.ADMIN, client_1.Role.TEAM_LEAD]), (0, validateRequest_js_1.validateRequest)({ body: decisionSchema }), async (req, res, next) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    try {
        const decision = await pipeline_service_js_1.pipelineService.submitApprovalDecision(id, req.user.id, req.body.status, req.body.notes);
        res.status(200).json({
            success: true,
            data: decision
        });
    }
    catch (err) {
        next(err);
    }
});
