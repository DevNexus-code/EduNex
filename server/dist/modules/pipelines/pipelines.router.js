"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pipelinesRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const store_js_1 = require("../../common/db/store.js");
const pipeline_service_js_1 = require("./pipeline.service.js");
const auth_js_1 = require("../../common/middleware/auth.js");
const validateRequest_js_1 = require("../../common/middleware/validateRequest.js");
const index_js_1 = require("../../common/errors/index.js");
exports.pipelinesRouter = (0, express_1.Router)();
const triggerRunSchema = zod_1.z.object({
    projectId: zod_1.z.string().min(1),
    triggerType: zod_1.z.enum(['MANUAL', 'WEBHOOK', 'SCHEDULED']).default('MANUAL')
});
exports.pipelinesRouter.get('/', auth_js_1.authenticate, (req, res) => {
    const projectId = req.query.projectId;
    const runs = store_js_1.store.getPipelineRuns(projectId).map((r) => {
        const stages = store_js_1.store.getStagesForRun(r.id);
        const approvals = store_js_1.store.getApprovals(undefined, r.projectId).filter((a) => a.pipelineRunId === r.id);
        const project = store_js_1.store.findProjectById(r.projectId);
        return {
            ...r,
            project,
            stagesCount: stages.length,
            passedStagesCount: stages.filter((s) => s.status === 'PASSED').length,
            approvals
        };
    });
    res.status(200).json({
        success: true,
        data: runs
    });
});
exports.pipelinesRouter.get('/:id', auth_js_1.authenticate, (req, res, next) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const run = store_js_1.store.findPipelineRunById(id);
    if (!run) {
        return next(new index_js_1.NotFoundError(`Pipeline run '${id}' not found.`));
    }
    const project = store_js_1.store.findProjectById(run.projectId);
    const stages = store_js_1.store.getStagesForRun(run.id).map((stage) => {
        const logs = store_js_1.store.getStageLogs(stage.id);
        const artifacts = store_js_1.store.stageArtifacts.filter((a) => a.pipelineStageId === stage.id);
        const approval = store_js_1.store.stageApprovals.find((a) => a.pipelineStageId === stage.id) || null;
        return {
            ...stage,
            logs,
            artifacts,
            approval
        };
    });
    const securityScan = store_js_1.store.getSecurityReport(run.id) || null;
    const testRun = store_js_1.store.getTestReport(run.id) || null;
    const deployments = store_js_1.store.getDeployments(run.id);
    res.status(200).json({
        success: true,
        data: {
            ...run,
            project,
            stages,
            securityScan,
            testRun,
            deployments
        }
    });
});
exports.pipelinesRouter.post('/', auth_js_1.authenticate, (0, validateRequest_js_1.validateRequest)({ body: triggerRunSchema }), async (req, res, next) => {
    try {
        const run = await pipeline_service_js_1.pipelineService.triggerRun(req.body.projectId, req.body.triggerType, req.user.id);
        res.status(201).json({
            success: true,
            data: run
        });
    }
    catch (err) {
        next(err);
    }
});
exports.pipelinesRouter.post('/stages/:stageId/retry', auth_js_1.authenticate, async (req, res, next) => {
    const stageId = Array.isArray(req.params.stageId) ? req.params.stageId[0] : req.params.stageId;
    try {
        const stage = await pipeline_service_js_1.pipelineService.retryStage(stageId, req.user?.id);
        res.status(200).json({
            success: true,
            data: stage
        });
    }
    catch (err) {
        next(err);
    }
});
