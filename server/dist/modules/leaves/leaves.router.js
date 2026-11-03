"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leavesRouter = void 0;
const express_1 = require("express");
const crypto_1 = require("crypto");
const prisma_js_1 = require("../../common/db/prisma.js");
const auth_js_1 = require("../../common/middleware/auth.js");
const query_validators_js_1 = require("../../common/utils/query-validators.js");
exports.leavesRouter = (0, express_1.Router)();
exports.leavesRouter.use(auth_js_1.authenticate);
function mapLeave(l) {
    return {
        id: l.id,
        staffId: l.staffId,
        staff: l.Staff
            ? {
                id: l.Staff.id,
                staffId: l.Staff.staffId,
                firstName: l.Staff.User?.firstName || '',
                lastName: l.Staff.User?.lastName || '',
                email: l.Staff.User?.email || '',
                designation: l.Staff.designation
            }
            : undefined,
        leaveType: l.leaveType,
        startDate: l.startDate ? l.startDate.toISOString().split('T')[0] : '',
        endDate: l.endDate ? l.endDate.toISOString().split('T')[0] : '',
        reason: l.reason,
        status: l.status,
        reviewedById: l.reviewedById,
        reviewRemarks: l.reviewNotes || null,
        reviewedAt: l.reviewedAt ? l.reviewedAt.toISOString() : null,
        createdAt: l.createdAt
    };
}
exports.leavesRouter.get('/', async (req, res, next) => {
    try {
        const staffId = (0, query_validators_js_1.validateDatabaseId)(req.query.staffId, 'staffId');
        const rawStatus = (0, query_validators_js_1.normalizeOptionalString)(req.query.status);
        const status = rawStatus && Object.values(prisma_js_1.LeaveStatus).includes(rawStatus.toUpperCase())
            ? rawStatus.toUpperCase()
            : undefined;
        const leaves = await prisma_js_1.prisma.leaveRequest.findMany({
            where: {
                ...(staffId && { staffId }),
                ...(status && { status })
            },
            include: {
                Staff: {
                    include: { User: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ data: leaves.map(mapLeave) });
    }
    catch (err) {
        next(err);
    }
});
exports.leavesRouter.post('/', async (req, res, next) => {
    try {
        const { staffId, leaveType, startDate, endDate, reason } = req.body;
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const totalDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
        const leave = await prisma_js_1.prisma.leaveRequest.create({
            data: {
                id: (0, crypto_1.randomUUID)(),
                staffId,
                leaveType: leaveType || 'CASUAL',
                startDate: start,
                endDate: end,
                totalDays,
                reason,
                status: 'PENDING',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            include: {
                Staff: {
                    include: { User: true }
                }
            }
        });
        res.status(201).json({ data: mapLeave(leave) });
    }
    catch (err) {
        next(err);
    }
});
exports.leavesRouter.patch('/:id/review', async (req, res, next) => {
    try {
        const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const id = (0, query_validators_js_1.validateDatabaseId)(rawId, 'id') || rawId;
        const { status, reviewNotes } = req.body;
        const reviewedById = req.user?.id || (0, crypto_1.randomUUID)();
        const leave = await prisma_js_1.prisma.leaveRequest.update({
            where: { id },
            data: {
                status: status,
                reviewNotes: reviewNotes || null,
                reviewedById,
                reviewedAt: new Date(),
                updatedAt: new Date()
            },
            include: {
                Staff: {
                    include: { User: true }
                }
            }
        });
        res.json({ data: mapLeave(leave) });
    }
    catch (err) {
        next(err);
    }
});
