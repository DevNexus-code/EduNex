"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeOptionalString = normalizeOptionalString;
exports.validateDatabaseId = validateDatabaseId;
exports.validateStudentStatus = validateStudentStatus;
exports.validateStaffCategory = validateStaffCategory;
exports.validateStaffStatus = validateStaffStatus;
exports.validateSearch = validateSearch;
const prisma_js_1 = require("../db/prisma.js");
const index_js_1 = require("../errors/index.js");
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
/**
 * Normalizes an optional query parameter value.
 * Returns a trimmed string, or undefined if the value is missing, empty, or the literal string "undefined", "null", or "all".
 */
function normalizeOptionalString(val) {
    if (val === undefined || val === null)
        return undefined;
    if (typeof val !== 'string') {
        if (typeof val === 'number' || typeof val === 'boolean') {
            return String(val);
        }
        return undefined;
    }
    const trimmed = val.trim();
    if (trimmed === '' ||
        trimmed.toLowerCase() === 'undefined' ||
        trimmed.toLowerCase() === 'null' ||
        trimmed.toLowerCase() === 'all') {
        return undefined;
    }
    return trimmed;
}
/**
 * Validates whether a value is a valid UUID or undefined.
 * Throws a QueryValidationError (HTTP 400) if the value is non-empty but does not match a UUID pattern.
 */
function validateDatabaseId(val, fieldName) {
    const normalized = normalizeOptionalString(val);
    if (!normalized)
        return undefined;
    if (!UUID_REGEX.test(normalized)) {
        throw new index_js_1.QueryValidationError(`Invalid ${fieldName} identifier format. Must be a valid UUID.`, fieldName);
    }
    return normalized;
}
/**
 * Validates whether a value is a valid StudentStatus enum or undefined.
 * Throws a QueryValidationError (HTTP 400) if the value is non-empty but not a recognized StudentStatus.
 */
function validateStudentStatus(val) {
    const normalized = normalizeOptionalString(val);
    if (!normalized)
        return undefined;
    const upper = normalized.toUpperCase();
    const allowed = Object.values(prisma_js_1.StudentStatus);
    if (allowed.includes(upper)) {
        return upper;
    }
    throw new index_js_1.QueryValidationError(`Invalid student status filter. Allowed values: ${allowed.join(', ')}.`, 'status');
}
/**
 * Validates whether a value is a valid StaffCategory enum or undefined.
 * Throws a QueryValidationError (HTTP 400) if the value is non-empty but not a recognized StaffCategory.
 */
function validateStaffCategory(val) {
    const normalized = normalizeOptionalString(val);
    if (!normalized)
        return undefined;
    const upper = normalized.toUpperCase();
    const allowed = Object.values(prisma_js_1.StaffCategory);
    if (allowed.includes(upper)) {
        return upper;
    }
    throw new index_js_1.QueryValidationError(`Invalid staff category filter. Allowed values: ${allowed.join(', ')}.`, 'category');
}
/**
 * Validates whether a value is a valid StaffStatus enum or undefined.
 * Throws a QueryValidationError (HTTP 400) if the value is non-empty but not a recognized StaffStatus.
 */
function validateStaffStatus(val) {
    const normalized = normalizeOptionalString(val);
    if (!normalized)
        return undefined;
    const upper = normalized.toUpperCase();
    const allowed = Object.values(prisma_js_1.StaffStatus);
    if (allowed.includes(upper)) {
        return upper;
    }
    throw new index_js_1.QueryValidationError(`Invalid staff status filter. Allowed values: ${allowed.join(', ')}.`, 'status');
}
/**
 * Validates search query input.
 * Returns a trimmed non-empty search string, or undefined if absent or invalid.
 */
function validateSearch(val) {
    return normalizeOptionalString(val);
}
