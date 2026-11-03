"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = void 0;
exports.extractSessionToken = extractSessionToken;
exports.authenticate = authenticate;
exports.requireRole = requireRole;
const index_js_1 = require("../errors/index.js");
const store_js_1 = require("../db/store.js");
function extractSessionToken(req) {
    if (req.cookies && (req.cookies.edunex_session || req.cookies.nexdesk_session)) {
        return req.cookies.edunex_session || req.cookies.nexdesk_session;
    }
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }
    return null;
}
async function authenticate(req, _res, next) {
    const token = extractSessionToken(req);
    if (!token) {
        return next(new index_js_1.UnauthorizedError('Authentication session missing or expired.'));
    }
    const session = store_js_1.store.getSession(token);
    if (!session) {
        return next(new index_js_1.UnauthorizedError('Invalid or expired session. Please sign in again.'));
    }
    let user = store_js_1.store.findUserById(session.userId);
    if (!user) {
        user = await store_js_1.store.fetchAndCacheUserById(session.userId);
    }
    if (!user || !user.isActive) {
        return next(new index_js_1.UnauthorizedError('User account is deactivated or not found.'));
    }
    req.user = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        departmentId: user.departmentId || null,
        parentId: user.parentId || null,
        phone: user.phone || null,
        address: user.address || null
    };
    next();
}
function requireRole(allowedRoles) {
    return (req, _res, next) => {
        if (!req.user) {
            return next(new index_js_1.UnauthorizedError('Authentication required.'));
        }
        if (!allowedRoles.includes(req.user.role)) {
            return next(new index_js_1.ForbiddenError(`Access denied. Role '${req.user.role}' does not have sufficient permissions for this operation.`));
        }
        next();
    };
}
exports.authorize = requireRole;
