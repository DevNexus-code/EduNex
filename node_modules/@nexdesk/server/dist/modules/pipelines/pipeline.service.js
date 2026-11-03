"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pipelineService = exports.PipelineService = void 0;
const client_1 = require("@prisma/client");
const store_js_1 = require("../../common/db/store.js");
const agent_service_js_1 = require("../agents/agent.service.js");
const index_js_1 = require("../../common/errors/index.js");
const logger_js_1 = require("../../common/utils/logger.js");
class PipelineService {
    /**
     * Triggers a new pipeline run for a project and begins execution.
     */
    async triggerRun(projectId, triggerType = 'MANUAL', userId) {
        const project = store_js_1.store.findProjectById(projectId);
        if (!project) {
            throw new index_js_1.NotFoundError(`Project with ID '${projectId}' not found.`);
        }
        const run = store_js_1.store.createPipelineRun(projectId, triggerType, userId);
        store_js_1.store.logAction('PIPELINE_RUN_TRIGGERED', 'PipelineRun', run.id, userId, {
            projectId,
            runNumber: run.runNumber,
            triggerType
        });
        // Automatically execute the first stage
        await this.executeCurrentStage(run.id);
        return store_js_1.store.findPipelineRunById(run.id);
    }
    /**
     * Executes the active stage of a pipeline run.
     */
    async executeCurrentStage(pipelineRunId) {
        const run = store_js_1.store.findPipelineRunById(pipelineRunId);
        if (!run)
            return null;
        const stages = store_js_1.store.getStagesForRun(pipelineRunId);
        const stage = stages.find((s) => s.stageOrder === run.currentStageIndex);
        if (!stage)
            return null;
        const project = store_js_1.store.findProjectById(run.projectId);
        const projectName = project ? project.name : 'Unknown Project';
        // Verify Gate Pre-conditions: Ensure preceding gate was approved if one existed
        if (stage.stageOrder > 1) {
            const prevStage = stages.find((s) => s.stageOrder === stage.stageOrder - 1);
            if (prevStage && prevStage.status === client_1.StageStatus.WAITING_APPROVAL) {
                logger_js_1.logger.warn({ runId: run.id, stage: prevStage.name }, 'Cannot proceed: Preceding stage is awaiting human approval gate.');
                return stage;
            }
        }
        stage.status = client_1.StageStatus.RUNNING;
        stage.startedAt = new Date();
        run.status = client_1.PipelineStatus.RUNNING;
        const agent = agent_service_js_1.agentService.getAgent(stage.agentRole);
        try {
            const result = await agent.execute({
                projectId: run.projectId,
                projectName,
                pipelineRunId: run.id,
                stageId: stage.id,
                stageName: stage.name,
                inputPayload: stage.inputPayload,
                isSimulated: run.isSimulated
            });
            // Save execution logs
            result.logs.forEach((log) => {
                store_js_1.store.addStageLog(stage.id, log.level, log.message, log.metadata);
            });
            // Save generated artifacts
            result.artifacts.forEach((art) => {
                store_js_1.store.stageArtifacts.push({
                    id: `art-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    pipelineStageId: stage.id,
                    name: art.name,
                    artifactType: art.artifactType,
                    content: art.content,
                    sizeBytes: Buffer.byteLength(art.content, 'utf8'),
                    createdAt: new Date()
                });
            });
            stage.outputPayload = result.outputPayload;
            stage.completedAt = new Date();
            stage.durationSeconds = result.durationSeconds;
            run.totalTokensUsed += result.tokensUsed;
            if (result.status === 'REQUIRES_APPROVAL') {
                stage.status = client_1.StageStatus.WAITING_APPROVAL;
                run.status = client_1.PipelineStatus.WAITING_APPROVAL;
                // Map stage to appropriate gate type
                let gateType = client_1.ApprovalGateType.ARCHITECTURE_APPROVAL;
                if (stage.name === client_1.StageName.CODE_REVIEW) {
                    gateType = client_1.ApprovalGateType.CODE_MERGE_APPROVAL;
                }
                else if (stage.name === client_1.StageName.DEFECT_MONITORING) {
                    gateType = client_1.ApprovalGateType.PRODUCTION_RELEASE;
                }
                // Create or update pending StageApproval
                let approval = store_js_1.store.stageApprovals.find((a) => a.pipelineStageId === stage.id);
                if (!approval) {
                    approval = {
                        id: `appr-${Date.now()}`,
                        pipelineRunId: run.id,
                        pipelineStageId: stage.id,
                        gateType,
                        status: client_1.ApprovalStatus.PENDING,
                        decisionNotes: null,
                        reviewerId: null,
                        decidedAt: null,
                        createdAt: new Date()
                    };
                    store_js_1.store.stageApprovals.push(approval);
                }
                store_js_1.store.logAction('APPROVAL_GATE_HALTED', 'PipelineStage', stage.id, undefined, {
                    gateType,
                    runNumber: run.runNumber,
                    stageName: stage.name
                });
                logger_js_1.logger.info({ runId: run.id, gate: gateType }, 'Pipeline execution safely halted at Human Approval Gate.');
                return stage;
            }
            if (result.status === 'SUCCESS') {
                stage.status = client_1.StageStatus.PASSED;
                // Advance to next stage if available
                if (run.currentStageIndex < 8) {
                    run.currentStageIndex += 1;
                    const nextStage = stages.find((s) => s.stageOrder === run.currentStageIndex);
                    if (nextStage) {
                        nextStage.status = client_1.StageStatus.RUNNING;
                        // Execute next stage sequentially
                        await this.executeCurrentStage(pipelineRunId);
                    }
                }
                else {
                    // All 8 stages finished
                    run.status = client_1.PipelineStatus.COMPLETED;
                    run.completedAt = new Date();
                    if (run.startedAt) {
                        run.durationSeconds = Math.round((run.completedAt.getTime() - run.startedAt.getTime()) / 1000);
                    }
                    store_js_1.store.logAction('PIPELINE_RUN_COMPLETED', 'PipelineRun', run.id, undefined, {
                        runNumber: run.runNumber,
                        totalTokensUsed: run.totalTokensUsed
                    });
                }
            }
        }
        catch (err) {
            stage.status = client_1.StageStatus.FAILED;
            stage.errorMessage = err.message || 'Stage execution failed.';
            run.status = client_1.PipelineStatus.FAILED;
            logger_js_1.logger.error({ stageId: stage.id, error: err.message }, 'Pipeline stage execution failed');
        }
        return stage;
    }
    /**
     * Evaluates human approval decision and resumes pipeline if approved.
     */
    async submitApprovalDecision(approvalId, reviewerId, status, notes) {
        const approval = store_js_1.store.findApprovalById(approvalId);
        if (!approval) {
            throw new index_js_1.NotFoundError(`Approval request '${approvalId}' not found.`);
        }
        if (approval.status !== client_1.ApprovalStatus.PENDING) {
            throw new index_js_1.ConflictError(`Approval '${approvalId}' has already been decided (${approval.status}).`);
        }
        store_js_1.store.decideApproval(approvalId, reviewerId, status, notes);
        store_js_1.store.logAction('APPROVAL_DECIDED', 'StageApproval', approvalId, reviewerId, {
            status,
            gateType: approval.gateType,
            notes
        });
        const run = store_js_1.store.findPipelineRunById(approval.pipelineRunId);
        if (!run)
            return approval;
        if (status === client_1.ApprovalStatus.APPROVED) {
            if (approval.pipelineStageId) {
                const approvedStage = store_js_1.store.findStageById(approval.pipelineStageId);
                if (approvedStage) {
                    approvedStage.status = client_1.StageStatus.PASSED;
                }
            }
            // Advance to next stage and resume execution
            if (run.currentStageIndex < 8) {
                run.currentStageIndex += 1;
                run.status = client_1.PipelineStatus.RUNNING;
                await this.executeCurrentStage(run.id);
            }
            else {
                run.status = client_1.PipelineStatus.COMPLETED;
                run.completedAt = new Date();
            }
        }
        else {
            run.status = client_1.PipelineStatus.FAILED;
        }
        return approval;
    }
    /**
     * Retries a failed or blocked stage.
     */
    async retryStage(stageId, userId) {
        const stage = store_js_1.store.findStageById(stageId);
        if (!stage) {
            throw new index_js_1.NotFoundError(`Pipeline stage '${stageId}' not found.`);
        }
        stage.status = client_1.StageStatus.RUNNING;
        stage.errorMessage = null;
        stage.retryCount += 1;
        const run = store_js_1.store.findPipelineRunById(stage.pipelineRunId);
        if (run) {
            run.status = client_1.PipelineStatus.RUNNING;
            run.currentStageIndex = stage.stageOrder;
            store_js_1.store.logAction('STAGE_RETRY_TRIGGERED', 'PipelineStage', stage.id, userId, {
                retryCount: stage.retryCount
            });
            await this.executeCurrentStage(run.id);
        }
        return stage;
    }
}
exports.PipelineService = PipelineService;
exports.pipelineService = new PipelineService();
