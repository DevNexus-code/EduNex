"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.announcementsRouter = void 0;
const express_1 = require("express");
const crypto_1 = require("crypto");
const prisma_js_1 = require("../../common/db/prisma.js");
const auth_js_1 = require("../../common/middleware/auth.js");
exports.announcementsRouter = (0, express_1.Router)();
exports.announcementsRouter.use(auth_js_1.authenticate);
function mapAnnouncement(a) {
    return {
        id: a.id,
        title: a.title,
        content: a.content,
        priority: a.priority,
        targetAudience: a.targetAudience,
        departmentId: a.departmentId,
        department: a.Department || null,
        authorId: a.authorId,
        author: a.User ? { firstName: a.User.firstName, lastName: a.User.lastName } : null,
        publishDate: a.createdAt.toISOString().split('T')[0],
        expiryDate: a.expiresAt ? a.expiresAt.toISOString().split('T')[0] : null,
        isActive: true,
        createdAt: a.createdAt
    };
}
exports.announcementsRouter.get('/', async (req, res, next) => {
    try {
        const { targetAudience, departmentId } = req.query;
        const announcements = await prisma_js_1.prisma.announcement.findMany({
            where: {
                ...(targetAudience && targetAudience !== 'ALL' && { targetAudience: targetAudience }),
                ...(departmentId && { departmentId: String(departmentId) })
            },
            include: {
                Department: true,
                User: true
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ data: announcements.map(mapAnnouncement) });
    }
    catch (err) {
        next(err);
    }
});
exports.announcementsRouter.post('/', async (req, res, next) => {
    try {
        const { title, content, priority, targetAudience, departmentId, expiryDate } = req.body;
        const authorId = req.user?.id || (0, crypto_1.randomUUID)();
        const announcement = await prisma_js_1.prisma.announcement.create({
            data: {
                id: (0, crypto_1.randomUUID)(),
                title,
                content,
                priority: (priority || 'NORMAL'),
                targetAudience: (targetAudience || 'ALL'),
                departmentId: departmentId || null,
                authorId,
                expiresAt: expiryDate ? new Date(expiryDate) : null,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            include: {
                Department: true,
                User: true
            }
        });
        res.status(201).json({ data: mapAnnouncement(announcement) });
    }
    catch (err) {
        next(err);
    }
});
exports.announcementsRouter.patch('/:id', async (req, res, next) => {
    try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const { title, content, priority, targetAudience, departmentId } = req.body;
        const updated = await prisma_js_1.prisma.announcement.update({
            where: { id },
            data: {
                ...(title && { title }),
                ...(content && { content }),
                ...(priority && { priority }),
                ...(targetAudience && { targetAudience }),
                ...(departmentId !== undefined && { departmentId }),
                updatedAt: new Date()
            },
            include: {
                Department: true,
                User: true
            }
        });
        res.json({ data: mapAnnouncement(updated) });
    }
    catch (err) {
        next(err);
    }
});
exports.announcementsRouter.delete('/:id', async (req, res, next) => {
    try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        await prisma_js_1.prisma.announcement.delete({ where: { id } });
        res.json({ data: { message: 'Announcement deleted successfully.' } });
    }
    catch (err) {
        next(err);
    }
});
