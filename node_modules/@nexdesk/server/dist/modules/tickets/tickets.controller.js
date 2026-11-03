"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listTicketsController = listTicketsController;
exports.getTicketByIdController = getTicketByIdController;
exports.createTicketController = createTicketController;
exports.updateTicketController = updateTicketController;
exports.addCommentController = addCommentController;
const tickets_service_js_1 = require("./tickets.service.js");
const index_js_1 = require("../../common/errors/index.js");
function getParamId(req) {
    return Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
}
function listTicketsController(req, res, next) {
    try {
        if (!req.user)
            throw new index_js_1.UnauthorizedError();
        const result = tickets_service_js_1.ticketsService.listTickets(req.user, req.query);
        res.status(200).json({
            success: true,
            data: result.tickets,
            meta: {
                page: result.page,
                limit: result.limit,
                totalItems: result.total,
                totalPages: Math.ceil(result.total / result.limit) || 1
            }
        });
    }
    catch (error) {
        next(error);
    }
}
function getTicketByIdController(req, res, next) {
    try {
        if (!req.user)
            throw new index_js_1.UnauthorizedError();
        const id = getParamId(req);
        const ticket = tickets_service_js_1.ticketsService.getTicketById(id, req.user);
        res.status(200).json({
            success: true,
            data: { ticket }
        });
    }
    catch (error) {
        next(error);
    }
}
function createTicketController(req, res, next) {
    try {
        if (!req.user)
            throw new index_js_1.UnauthorizedError();
        const ticket = tickets_service_js_1.ticketsService.createTicket(req.body, req.user);
        res.status(201).json({
            success: true,
            data: { ticket }
        });
    }
    catch (error) {
        next(error);
    }
}
function updateTicketController(req, res, next) {
    try {
        if (!req.user)
            throw new index_js_1.UnauthorizedError();
        const id = getParamId(req);
        const ticket = tickets_service_js_1.ticketsService.updateTicket(id, req.body, req.user);
        res.status(200).json({
            success: true,
            data: { ticket }
        });
    }
    catch (error) {
        next(error);
    }
}
function addCommentController(req, res, next) {
    try {
        if (!req.user)
            throw new index_js_1.UnauthorizedError();
        const id = getParamId(req);
        const comment = tickets_service_js_1.ticketsService.addComment(id, req.body, req.user);
        res.status(201).json({
            success: true,
            data: { comment }
        });
    }
    catch (error) {
        next(error);
    }
}
