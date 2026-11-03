"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.specificationsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const store_js_1 = require("../../common/db/store.js");
const auth_js_1 = require("../../common/middleware/auth.js");
const validateRequest_js_1 = require("../../common/middleware/validateRequest.js");
const index_js_1 = require("../../common/errors/index.js");
exports.specificationsRouter = (0, express_1.Router)();
const updateReqSchema = zod_1.z.object({
    title: zod_1.z.string().min(2),
    rawContent: zod_1.z.string().min(10),
    userStories: zod_1.z.array(zod_1.z.any()).optional(),
    acceptanceCriteria: zod_1.z.array(zod_1.z.string()).optional()
});
const updateArchSchema = zod_1.z.object({
    title: zod_1.z.string().min(2),
    overview: zod_1.z.string().min(10),
    adrs: zod_1.z.array(zod_1.z.any()).optional(),
    diagrams: zod_1.z.array(zod_1.z.any()).optional()
});
exports.specificationsRouter.get('/requirements/:projectId', auth_js_1.authenticate, (req, res, next) => {
    const projectId = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;
    const reqDoc = store_js_1.store.getRequirementsByProject(projectId);
    if (!reqDoc) {
        return next(new index_js_1.NotFoundError(`Requirements for project '${projectId}' not found.`));
    }
    res.status(200).json({
        success: true,
        data: reqDoc
    });
});
exports.specificationsRouter.put('/requirements/:projectId', auth_js_1.authenticate, (0, validateRequest_js_1.validateRequest)({ body: updateReqSchema }), (req, res, next) => {
    const projectId = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;
    let reqDoc = store_js_1.store.getRequirementsByProject(projectId);
    if (reqDoc) {
        reqDoc.title = req.body.title;
        reqDoc.rawContent = req.body.rawContent;
        if (req.body.userStories)
            reqDoc.userStories = req.body.userStories;
        if (req.body.acceptanceCriteria)
            reqDoc.acceptanceCriteria = req.body.acceptanceCriteria;
        reqDoc.version += 1;
        reqDoc.updatedAt = new Date();
    }
    else {
        reqDoc = {
            id: `req-${Date.now()}`,
            projectId,
            title: req.body.title,
            rawContent: req.body.rawContent,
            userStories: req.body.userStories || [],
            acceptanceCriteria: req.body.acceptanceCriteria || [],
            version: 1,
            isApproved: false,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        store_js_1.store.requirements.push(reqDoc);
    }
    res.status(200).json({
        success: true,
        data: reqDoc
    });
});
exports.specificationsRouter.get('/architecture/:projectId', auth_js_1.authenticate, (req, res, next) => {
    const projectId = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;
    const archDoc = store_js_1.store.getArchitectureByProject(projectId);
    if (!archDoc) {
        return next(new index_js_1.NotFoundError(`Architecture doc for project '${projectId}' not found.`));
    }
    res.status(200).json({
        success: true,
        data: archDoc
    });
});
exports.specificationsRouter.put('/architecture/:projectId', auth_js_1.authenticate, (0, validateRequest_js_1.validateRequest)({ body: updateArchSchema }), (req, res, next) => {
    const projectId = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;
    let archDoc = store_js_1.store.getArchitectureByProject(projectId);
    if (archDoc) {
        archDoc.title = req.body.title;
        archDoc.overview = req.body.overview;
        if (req.body.adrs)
            archDoc.adrs = req.body.adrs;
        if (req.body.diagrams)
            archDoc.diagrams = req.body.diagrams;
        archDoc.version += 1;
        archDoc.updatedAt = new Date();
    }
    else {
        archDoc = {
            id: `arch-${Date.now()}`,
            projectId,
            title: req.body.title,
            overview: req.body.overview,
            adrs: req.body.adrs || [],
            diagrams: req.body.diagrams || [],
            version: 1,
            isApproved: false,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        store_js_1.store.architectureDocs.push(archDoc);
    }
    res.status(200).json({
        success: true,
        data: archDoc
    });
});
