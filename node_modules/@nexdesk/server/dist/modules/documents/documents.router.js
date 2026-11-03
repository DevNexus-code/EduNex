"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.documentsRouter = void 0;
const express_1 = require("express");
const crypto_1 = require("crypto");
const prisma_js_1 = require("../../common/db/prisma.js");
const auth_js_1 = require("../../common/middleware/auth.js");
exports.documentsRouter = (0, express_1.Router)();
exports.documentsRouter.use(auth_js_1.authenticate);
function mapDocument(d) {
    return {
        id: d.id,
        title: d.title,
        documentType: d.type,
        fileUrl: d.fileUrl,
        fileSize: d.fileSize,
        mimeType: d.mimeType,
        studentId: d.studentId,
        student: d.Student
            ? {
                id: d.Student.id,
                studentId: d.Student.studentId,
                firstName: d.Student.User?.firstName || '',
                lastName: d.Student.User?.lastName || ''
            }
            : null,
        staffId: d.staffId,
        staff: d.Staff
            ? {
                id: d.Staff.id,
                staffId: d.Staff.staffId,
                firstName: d.Staff.User?.firstName || '',
                lastName: d.Staff.User?.lastName || ''
            }
            : null,
        uploadedById: d.uploadedById,
        createdAt: d.createdAt
    };
}
exports.documentsRouter.get('/', async (req, res, next) => {
    try {
        const rawStudentId = req.query.studentId ? String(req.query.studentId).trim() : undefined;
        const studentId = rawStudentId && rawStudentId !== 'undefined' && rawStudentId !== 'null' ? rawStudentId : undefined;
        const rawStaffId = req.query.staffId ? String(req.query.staffId).trim() : undefined;
        const staffId = rawStaffId && rawStaffId !== 'undefined' && rawStaffId !== 'null' ? rawStaffId : undefined;
        const rawType = req.query.documentType ? String(req.query.documentType).trim().toUpperCase() : undefined;
        const documentType = rawType && rawType !== 'UNDEFINED' && rawType !== 'NULL' && Object.values(prisma_js_1.DocumentType).includes(rawType)
            ? rawType
            : undefined;
        const documents = await prisma_js_1.prisma.document.findMany({
            where: {
                ...(studentId && { studentId }),
                ...(staffId && { staffId }),
                ...(documentType && { type: documentType })
            },
            include: {
                Student: {
                    include: { User: true }
                },
                Staff: {
                    include: { User: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ data: documents.map(mapDocument) });
    }
    catch (err) {
        next(err);
    }
});
exports.documentsRouter.post('/', async (req, res, next) => {
    try {
        const { title, documentType, fileUrl, fileSize, mimeType, studentId, staffId } = req.body;
        const uploadedById = req.user?.id || (0, crypto_1.randomUUID)();
        const fileName = title.replace(/\s+/g, '_') + '.pdf';
        const document = await prisma_js_1.prisma.document.create({
            data: {
                id: (0, crypto_1.randomUUID)(),
                title,
                type: (documentType || 'GENERAL'),
                fileUrl: fileUrl || 'https://edunex.internal/docs/sample.pdf',
                fileName,
                fileSize: Number(fileSize) || 1024,
                mimeType: mimeType || 'application/pdf',
                studentId: studentId || null,
                staffId: staffId || null,
                uploadedById,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            include: {
                Student: {
                    include: { User: true }
                },
                Staff: {
                    include: { User: true }
                }
            }
        });
        res.status(201).json({ data: mapDocument(document) });
    }
    catch (err) {
        next(err);
    }
});
exports.documentsRouter.delete('/:id', async (req, res, next) => {
    try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        await prisma_js_1.prisma.document.delete({ where: { id } });
        res.json({ data: { message: 'Document deleted successfully.' } });
    }
    catch (err) {
        next(err);
    }
});
