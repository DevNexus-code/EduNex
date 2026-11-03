"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tasksRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const store_js_1 = require("../../common/db/store.js");
const auth_js_1 = require("../../common/middleware/auth.js");
const validateRequest_js_1 = require("../../common/middleware/validateRequest.js");
const client_1 = require("@prisma/client");
const index_js_1 = require("../../common/errors/index.js");
exports.tasksRouter = (0, express_1.Router)();
const createTaskSchema = zod_1.z.object({
    projectId: zod_1.z.string().min(1),
    title: zod_1.z.string().min(2).max(120),
    description: zod_1.z.string().max(1000).optional(),
    priority: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
    stageName: zod_1.z.nativeEnum(client_1.StageName).optional(),
    assignedAgent: zod_1.z.nativeEnum(client_1.AgentRole).optional(),
    sprint: zod_1.z.string().max(50).optional()
});
const updateStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'])
});
exports.tasksRouter.get('/', auth_js_1.authenticate, (req, res) => {
    const projectId = req.query.projectId;
    const status = req.query.status;
    let tasks = projectId ? store_js_1.store.getTasksByProject(projectId, status) : store_js_1.store.taskItems;
    if (status && !projectId) {
        tasks = tasks.filter((t) => t.status === status);
    }
    const enriched = tasks.map((t) => {
        const assignee = t.assigneeId ? store_js_1.store.findUserById(t.assigneeId) : null;
        return {
            ...t,
            assignee: assignee ? { id: assignee.id, name: `${assignee.firstName} ${assignee.lastName}`, email: assignee.email } : null
        };
    });
    res.status(200).json({
        success: true,
        data: enriched
    });
});
exports.tasksRouter.post('/', auth_js_1.authenticate, (0, validateRequest_js_1.validateRequest)({ body: createTaskSchema }), (req, res) => {
    const task = store_js_1.store.createTask({
        projectId: req.body.projectId,
        title: req.body.title,
        description: req.body.description || null,
        status: client_1.TaskStatus.TODO,
        priority: req.body.priority,
        stageName: req.body.stageName || null,
        assignedAgent: req.body.assignedAgent || null,
        assigneeId: req.user.id,
        sprint: req.body.sprint || 'Sprint 1'
    });
    res.status(201).json({
        success: true,
        data: task
    });
});
exports.tasksRouter.patch('/:id/status', auth_js_1.authenticate, (0, validateRequest_js_1.validateRequest)({ body: updateStatusSchema }), (req, res, next) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const updated = store_js_1.store.updateTaskStatus(id, req.body.status);
    if (!updated) {
        return next(new index_js_1.NotFoundError(`Task '${id}' not found.`));
    }
    res.status(200).json({
        success: true,
        data: updated
    });
});
