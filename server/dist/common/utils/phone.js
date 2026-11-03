"use strict";
/**
 * Phone Number Normalization and Validation Utility
 *
 * Supports Indian mobile numbers with/without country code (+91, 91, 0, or bare 10-digit)
 * as well as international E.164 standard phone formats.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAndNormalizePhone = validateAndNormalizePhone;
exports.getPhoneSearchVariants = getPhoneSearchVariants;
function validateAndNormalizePhone(rawPhone, isRequired = false) {
    if (!rawPhone || !rawPhone.trim()) {
        if (isRequired) {
            return {
                isValid: false,
                canonical: null,
                national: null,
                display: null,
                error: 'Primary mobile number is required.'
            };
        }
        return {
            isValid: true,
            canonical: null,
            national: null,
            display: null
        };
    }
    const cleaned = rawPhone.trim();
    // Strip spaces, dashes, parentheses, dots
    const stripped = cleaned.replace(/[\s\-\(\)\.]/g, '');
    // Check for Indian mobile number patterns
    // 1. +91XXXXXXXXXX (13 chars)
    // 2. 91XXXXXXXXXX (12 chars)
    // 3. 0XXXXXXXXXX (11 chars)
    // 4. XXXXXXXXXX (10 chars)
    let tenDigit = null;
    if (/^\+91[6-9]\d{9}$/.test(stripped)) {
        tenDigit = stripped.slice(3);
    }
    else if (/^91[6-9]\d{9}$/.test(stripped)) {
        tenDigit = stripped.slice(2);
    }
    else if (/^0[6-9]\d{9}$/.test(stripped)) {
        tenDigit = stripped.slice(1);
    }
    else if (/^[6-9]\d{9}$/.test(stripped)) {
        tenDigit = stripped;
    }
    if (tenDigit) {
        const canonical = `+91${tenDigit}`;
        const display = `+91 ${tenDigit.slice(0, 5)} ${tenDigit.slice(5)}`;
        return {
            isValid: true,
            canonical,
            national: tenDigit,
            display
        };
    }
    // Generic international format (+ followed by 8 to 15 digits)
    if (/^\+[1-9]\d{7,14}$/.test(stripped)) {
        return {
            isValid: true,
            canonical: stripped,
            national: stripped.replace(/^\+/, ''),
            display: stripped
        };
    }
    return {
        isValid: false,
        canonical: null,
        national: null,
        display: null,
        error: 'Please enter a valid 10-digit mobile number (e.g. +91 98765 43210 or 9876543210).'
    };
}
/**
 * Normalizes any search query or login identifier that looks like a phone number
 * so that both `9876543210` and `+919876543210` can match in queries.
 */
function getPhoneSearchVariants(input) {
    const res = validateAndNormalizePhone(input, false);
    const variants = new Set();
    const trimmed = input.trim();
    if (trimmed) {
        variants.add(trimmed);
    }
    if (res.isValid && res.canonical) {
        variants.add(res.canonical);
        if (res.national) {
            variants.add(res.national);
            variants.add(`0${res.national}`);
            variants.add(`91${res.national}`);
        }
    }
    return Array.from(variants);
}
