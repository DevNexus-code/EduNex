import { StudentStatus, StaffCategory, StaffStatus } from '../db/prisma.js';
import { QueryValidationError } from '../errors/index.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Normalizes an optional query parameter value.
 * Returns a trimmed string, or undefined if the value is missing, empty, or the literal string "undefined", "null", or "all".
 */
export function normalizeOptionalString(val: unknown): string | undefined {
  if (val === undefined || val === null) return undefined;
  if (typeof val !== 'string') {
    if (typeof val === 'number' || typeof val === 'boolean') {
      return String(val);
    }
    return undefined;
  }
  const trimmed = val.trim();
  if (
    trimmed === '' ||
    trimmed.toLowerCase() === 'undefined' ||
    trimmed.toLowerCase() === 'null' ||
    trimmed.toLowerCase() === 'all'
  ) {
    return undefined;
  }
  return trimmed;
}

/**
 * Validates whether a value is a valid UUID or undefined.
 * Throws a QueryValidationError (HTTP 400) if the value is non-empty but does not match a UUID pattern.
 */
export function validateDatabaseId(val: unknown, fieldName: string): string | undefined {
  const normalized = normalizeOptionalString(val);
  if (!normalized) return undefined;

  if (!UUID_REGEX.test(normalized)) {
    throw new QueryValidationError(
      `Invalid ${fieldName} identifier format. Must be a valid UUID.`,
      fieldName
    );
  }
  return normalized;
}

/**
 * Validates whether a value is a valid StudentStatus enum or undefined.
 * Throws a QueryValidationError (HTTP 400) if the value is non-empty but not a recognized StudentStatus.
 */
export function validateStudentStatus(val: unknown): StudentStatus | undefined {
  const normalized = normalizeOptionalString(val);
  if (!normalized) return undefined;

  const upper = normalized.toUpperCase() as StudentStatus;
  const allowed = Object.values(StudentStatus);
  if (allowed.includes(upper)) {
    return upper;
  }
  throw new QueryValidationError(
    `Invalid student status filter. Allowed values: ${allowed.join(', ')}.`,
    'status'
  );
}

/**
 * Validates whether a value is a valid StaffCategory enum or undefined.
 * Throws a QueryValidationError (HTTP 400) if the value is non-empty but not a recognized StaffCategory.
 */
export function validateStaffCategory(val: unknown): StaffCategory | undefined {
  const normalized = normalizeOptionalString(val);
  if (!normalized) return undefined;

  const upper = normalized.toUpperCase() as StaffCategory;
  const allowed = Object.values(StaffCategory);
  if (allowed.includes(upper)) {
    return upper;
  }
  throw new QueryValidationError(
    `Invalid staff category filter. Allowed values: ${allowed.join(', ')}.`,
    'category'
  );
}

/**
 * Validates whether a value is a valid StaffStatus enum or undefined.
 * Throws a QueryValidationError (HTTP 400) if the value is non-empty but not a recognized StaffStatus.
 */
export function validateStaffStatus(val: unknown): StaffStatus | undefined {
  const normalized = normalizeOptionalString(val);
  if (!normalized) return undefined;

  const upper = normalized.toUpperCase() as StaffStatus;
  const allowed = Object.values(StaffStatus);
  if (allowed.includes(upper)) {
    return upper;
  }
  throw new QueryValidationError(
    `Invalid staff status filter. Allowed values: ${allowed.join(', ')}.`,
    'status'
  );
}

/**
 * Validates search query input.
 * Returns a trimmed non-empty search string, or undefined if absent or invalid.
 */
export function validateSearch(val: unknown): string | undefined {
  return normalizeOptionalString(val);
}
