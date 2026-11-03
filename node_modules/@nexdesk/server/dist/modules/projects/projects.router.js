"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const store_js_1 = require("../../common/db/store.js");
const auth_js_1 = require("../../common/middleware/auth.js");
const validateRequest_js_1 = require("../../common/middleware/validateRequest.js");
const index_js_1 = require("../../common/errors/index.js");
exports.projectsRouter = (0, express_1.Router)();
const createProjectSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(100),
    slug: zod_1.z.string().min(2).max(60).regex(/^[a-z0-9-]+$/, 'Slug must be alphanumeric lowercase with hyphens'),
    description: zod_1.z.string().min(5).max(500),
    repositoryUrl: zod_1.z.string().url().optional(),
    defaultBranch: zod_1.z.string().default('main')
});
exports.projectsRouter.get('/', auth_js_1.authenticate, (req, res) => {
    const projects = store_js_1.store.getProjects().map((p) => {
        const runs = store_js_1.store.getPipelineRuns(p.id);
        const activeRun = runs.find((r) => r.status === 'RUNNING' || r.status === 'WAITING_APPROVAL') || runs[0] || null;
        return {
            ...p,
            pipelineRunsCount: runs.length,
            activeRun
        };
    });
    res.status(200).json({
        success: true,
        data: projects
    });
});
exports.projectsRouter.get('/:idOrSlug', auth_js_1.authenticate, (req, res, next) => {
    const param = Array.isArray(req.params.idOrSlug) ? req.params.idOrSlug[0] : req.params.idOrSlug;
    const project = store_js_1.store.findProjectById(param) || store_js_1.store.findProjectBySlug(param);
    if (!project) {
        return next(new index_js_1.NotFoundError(`Project '${param}' not found.`));
    }
    const runs = store_js_1.store.getPipelineRuns(project.id);
    const requirements = store_js_1.store.getRequirementsByProject(project.id);
    const architecture = store_js_1.store.getArchitectureByProject(project.id);
    res.status(200).json({
        success: true,
        data: {
            project,
            pipelineRuns: runs,
            requirements,
            architecture
        }
    });
});
exports.projectsRouter.post('/', auth_js_1.authenticate, (0, validateRequest_js_1.validateRequest)({ body: createProjectSchema }), (req, res, next) => {
    const existing = store_js_1.store.findProjectBySlug(req.body.slug);
    if (existing) {
        return next(new index_js_1.ConflictError(`Project slug '${req.body.slug}' already exists.`));
    }
    const project = store_js_1.store.createProject({
        name: req.body.name,
        slug: req.body.slug,
        description: req.body.description,
        repositoryUrl: req.body.repositoryUrl || null,
        defaultBranch: req.body.defaultBranch || 'main',
        status: 'ACTIVE',
        ownerId: req.user.id
    });
    store_js_1.store.logAction('PROJECT_CREATED', 'Project', project.id, req.user.id, {
        slug: project.slug,
        name: project.name
    });
    res.status(201).json({
        success: true,
        data: project
    });
});
