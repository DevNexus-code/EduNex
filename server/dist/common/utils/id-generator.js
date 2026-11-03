"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateStudentId = generateStudentId;
exports.generateAdmissionNumber = generateAdmissionNumber;
exports.generateParentId = generateParentId;
exports.generateTemporaryPassword = generateTemporaryPassword;
const crypto_1 = require("crypto");
const prisma_js_1 = require("../db/prisma.js");
/**
 * Generates the next sequential unique Student ID in format STD-YYYY-XXXX
 */
async function generateStudentId(year = new Date().getFullYear()) {
    const latest = await prisma_js_1.prisma.student.findFirst({
        where: { studentId: { startsWith: `STD-${year}-` } },
        orderBy: { studentId: 'desc' },
        select: { studentId: true }
    });
    let nextSeq = 1;
    if (latest?.studentId) {
        const parts = latest.studentId.split('-');
        const lastNum = parseInt(parts[2], 10);
        if (!isNaN(lastNum)) {
            nextSeq = lastNum + 1;
        }
    }
    else {
        const count = await prisma_js_1.prisma.student.count();
        nextSeq = count + 1;
    }
    let candidate = `STD-${year}-${String(nextSeq).padStart(4, '0')}`;
    while (await prisma_js_1.prisma.student.findUnique({ where: { studentId: candidate } })) {
        nextSeq++;
        candidate = `STD-${year}-${String(nextSeq).padStart(4, '0')}`;
    }
    return candidate;
}
/**
 * Generates the next sequential unique Admission Number in format ADM-YYYY-XXXX
 */
async function generateAdmissionNumber(year = new Date().getFullYear()) {
    const latest = await prisma_js_1.prisma.student.findFirst({
        where: { admissionNumber: { startsWith: `ADM-${year}-` } },
        orderBy: { admissionNumber: 'desc' },
        select: { admissionNumber: true }
    });
    let nextSeq = 1;
    if (latest?.admissionNumber) {
        const parts = latest.admissionNumber.split('-');
        const lastNum = parseInt(parts[2], 10);
        if (!isNaN(lastNum)) {
            nextSeq = lastNum + 1;
        }
    }
    else {
        const count = await prisma_js_1.prisma.student.count();
        nextSeq = count + 1;
    }
    let candidate = `ADM-${year}-${String(nextSeq).padStart(4, '0')}`;
    while (await prisma_js_1.prisma.student.findUnique({ where: { admissionNumber: candidate } })) {
        nextSeq++;
        candidate = `ADM-${year}-${String(nextSeq).padStart(4, '0')}`;
    }
    return candidate;
}
/**
 * Generates the next sequential unique Parent ID in format PRN-YYYY-XXXX
 */
async function generateParentId(year = new Date().getFullYear()) {
    const latest = await prisma_js_1.prisma.parentProfile.findFirst({
        where: { parentId: { startsWith: `PRN-${year}-` } },
        orderBy: { parentId: 'desc' },
        select: { parentId: true }
    });
    let nextSeq = 1;
    if (latest?.parentId) {
        const parts = latest.parentId.split('-');
        const lastNum = parseInt(parts[2], 10);
        if (!isNaN(lastNum)) {
            nextSeq = lastNum + 1;
        }
    }
    else {
        const count = await prisma_js_1.prisma.parentProfile.count();
        nextSeq = count + 1;
    }
    let candidate = `PRN-${year}-${String(nextSeq).padStart(4, '0')}`;
    while (await prisma_js_1.prisma.parentProfile.findUnique({ where: { parentId: candidate } })) {
        nextSeq++;
        candidate = `PRN-${year}-${String(nextSeq).padStart(4, '0')}`;
    }
    return candidate;
}
/**
 * Generates an initial temporary credential following institutional policy.
 * If dateOfBirth is provided, uses format Edu@DDMMYYYY!
 * Otherwise, generates a secure random temporary credential Edu@<randomHex4>!
 */
function generateTemporaryPassword(dob) {
    if (dob) {
        const d = typeof dob === 'string' ? new Date(dob) : dob;
        if (!isNaN(d.getTime())) {
            const day = String(d.getUTCDate()).padStart(2, '0');
            const month = String(d.getUTCMonth() + 1).padStart(2, '0');
            const year = d.getUTCFullYear();
            const password = `Edu@${day}${month}${year}!`;
            return {
                password,
                isDobBased: true,
                policyNote: `Generated from Date of Birth (Edu@DDMMYYYY!). User must change upon first sign-in.`
            };
        }
    }
    const randSuffix = (0, crypto_1.randomBytes)(3).toString('hex').toUpperCase(); // 6 chars
    const password = `Edu@${randSuffix}!`;
    return {
        password,
        isDobBased: false,
        policyNote: `Secure one-time temporary credential. User must change upon first sign-in.`
    };
}
