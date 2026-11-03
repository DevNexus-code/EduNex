"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUsersController = getUsersController;
exports.getUserByIdController = getUserByIdController;
exports.createUserController = createUserController;
exports.updateUserController = updateUserController;
exports.resetPasswordController = resetPasswordController;
exports.getDepartmentsController = getDepartmentsController;
const users_service_js_1 = require("./users.service.js");
const client_1 = require("@prisma/client");
function getUsersController(req, res, next) {
    try {
        const { search, role, status, departmentId } = req.query;
        const users = users_service_js_1.usersService.listUsers({
            search: typeof search === 'string' ? search : undefined,
            role: typeof role === 'string' && Object.values(client_1.Role).includes(role) ? role : undefined,
            status: status === 'active' || status === 'inactive' ? status : undefined,
            departmentId: typeof departmentId === 'string' ? departmentId : undefined
        });
        res.status(200).json({
            success: true,
            data: { users }
        });
    }
    catch (error) {
        next(error);
    }
}
function getUserByIdController(req, res, next) {
    try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const user = users_service_js_1.usersService.getUserById(id);
        res.status(200).json({
            success: true,
            data: { user }
        });
    }
    catch (error) {
        next(error);
    }
}
async function createUserController(req, res, next) {
    try {
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'];
        const result = await users_service_js_1.usersService.createUser(req.body, req.user?.id, ip, userAgent);
        res.status(201).json({
            success: true,
            message: 'User account created and provisioned successfully.',
            data: result
        });
    }
    catch (error) {
        next(error);
    }
}
async function updateUserController(req, res, next) {
    try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'];
        const updatedUser = await users_service_js_1.usersService.updateUser(id, req.body, req.user?.id, ip, userAgent);
        res.status(200).json({
            success: true,
            message: 'User account updated successfully.',
            data: { user: updatedUser }
        });
    }
    catch (error) {
        next(error);
    }
}
async function resetPasswordController(req, res, next) {
    try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'];
        const result = await users_service_js_1.usersService.resetPassword(id, req.user?.id, ip, userAgent);
        res.status(200).json({
            success: true,
            message: result.message,
            data: result
        });
    }
    catch (error) {
        next(error);
    }
}
function getDepartmentsController(_req, res, next) {
    try {
        const departments = users_service_js_1.usersService.listDepartments();
        res.status(200).json({
            success: true,
            data: { departments }
        });
    }
    catch (error) {
        next(error);
    }
}
