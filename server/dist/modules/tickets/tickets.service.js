"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ticketsService = exports.TicketsService = void 0;
exports.calculateSlaDeadline = calculateSlaDeadline;
const crypto_1 = require("crypto");
const client_1 = require("@prisma/client");
const store_js_1 = require("../../common/db/store.js");
const index_js_1 = require("../../common/errors/index.js");
function calculateSlaDeadline(priority) {
    const now = Date.now();
    const hoursMap = {
        [client_1.TicketPriority.URGENT]: 4,
        [client_1.TicketPriority.HIGH]: 8,
        [client_1.TicketPriority.MEDIUM]: 24,
        [client_1.TicketPriority.LOW]: 72
    };
    const hours = hoursMap[priority] || 24;
    return new Date(now + hours * 60 * 60 * 1000);
}
class TicketsService {
    listTickets(user, filters) {
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        let items = [...store_js_1.store.tickets];
        // Enforce role-based scoping: Employees can only view tickets they created
        if (user.role === client_1.Role.EMPLOYEE) {
            items = items.filter((t) => t.creatorId === user.id);
        }
        else if (filters.creatorId) {
            items = items.filter((t) => t.creatorId === filters.creatorId);
        }
        if (filters.status) {
            items = items.filter((t) => t.status === filters.status);
        }
        if (filters.priority) {
            items = items.filter((t) => t.priority === filters.priority);
        }
        if (filters.category) {
            items = items.filter((t) => t.category === filters.category);
        }
        if (filters.assigneeId) {
            items = items.filter((t) => t.assigneeId === filters.assigneeId);
        }
        if (filters.search) {
            const q = filters.search.toLowerCase();
            items = items.filter((t) => t.title.toLowerCase().includes(q) ||
                t.ticketNumber.toLowerCase().includes(q) ||
                t.description.toLowerCase().includes(q));
        }
        // Sort newest first
        items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        const total = items.length;
        const start = (page - 1) * limit;
        const paginated = items.slice(start, start + limit);
        const enriched = paginated.map((t) => {
            const creator = store_js_1.store.findUserById(t.creatorId);
            const assignee = t.assigneeId ? store_js_1.store.findUserById(t.assigneeId) : null;
            const asset = t.assetId ? store_js_1.store.assets.find((a) => a.id === t.assetId) : null;
            // Filter internal comments for employees
            const visibleComments = user.role === client_1.Role.EMPLOYEE
                ? t.comments.filter((c) => !c.isInternal)
                : t.comments;
            return {
                ...t,
                comments: visibleComments,
                creatorName: creator ? `${creator.firstName} ${creator.lastName}` : 'Unknown',
                assigneeName: assignee ? `${assignee.firstName} ${assignee.lastName}` : null,
                assetName: asset ? `${asset.assetTag} - ${asset.name}` : null
            };
        });
        return { tickets: enriched, total, page, limit };
    }
    getTicketById(id, user) {
        const ticket = store_js_1.store.tickets.find((t) => t.id === id || t.ticketNumber === id);
        if (!ticket) {
            throw new index_js_1.NotFoundError(`Ticket '${id}' was not found.`);
        }
        // Ownership check: Employee can only view their own ticket
        if (user.role === client_1.Role.EMPLOYEE && ticket.creatorId !== user.id) {
            throw new index_js_1.ForbiddenError('You are not authorized to view this ticket.');
        }
        const creator = store_js_1.store.findUserById(ticket.creatorId);
        const assignee = ticket.assigneeId ? store_js_1.store.findUserById(ticket.assigneeId) : null;
        const asset = ticket.assetId ? store_js_1.store.assets.find((a) => a.id === ticket.assetId) : null;
        // Filter out internal comments for Employees
        const filteredComments = user.role === client_1.Role.EMPLOYEE
            ? ticket.comments.filter((c) => !c.isInternal)
            : ticket.comments;
        const enrichedComments = filteredComments.map((c) => {
            const author = store_js_1.store.findUserById(c.authorId);
            return {
                ...c,
                authorName: author ? `${author.firstName} ${author.lastName} (${author.role})` : 'System'
            };
        });
        return {
            ...ticket,
            comments: enrichedComments,
            creatorName: creator ? `${creator.firstName} ${creator.lastName}` : 'Unknown',
            assigneeName: assignee ? `${assignee.firstName} ${assignee.lastName}` : null,
            assetName: asset ? `${asset.assetTag} - ${asset.name}` : null
        };
    }
    createTicket(input, user) {
        const ticketCount = store_js_1.store.tickets.length + 10001;
        const ticketNumber = `TSK-${ticketCount}`;
        const slaDueAt = calculateSlaDeadline(input.priority);
        const ticket = {
            id: (0, crypto_1.randomUUID)(),
            ticketNumber,
            title: input.title,
            description: input.description,
            category: input.category,
            priority: input.priority,
            status: client_1.TicketStatus.NEW,
            creatorId: user.id,
            assigneeId: null,
            assetId: input.assetId || null,
            slaDueAt,
            resolvedAt: null,
            closedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            comments: [],
            history: [
                {
                    id: (0, crypto_1.randomUUID)(),
                    ticketId: '',
                    actorId: user.id,
                    fieldChanged: 'status',
                    oldValue: null,
                    newValue: 'NEW',
                    createdAt: new Date()
                }
            ]
        };
        ticket.history[0].ticketId = ticket.id;
        store_js_1.store.tickets.unshift(ticket);
        store_js_1.store.logAction('TICKET_CREATED', 'Ticket', ticket.id, user.id, {
            ticketNumber,
            title: ticket.title,
            priority: ticket.priority
        });
        return ticket;
    }
    updateTicket(id, input, user) {
        const ticket = store_js_1.store.tickets.find((t) => t.id === id);
        if (!ticket) {
            throw new index_js_1.NotFoundError(`Ticket '${id}' was not found.`);
        }
        // Role check: Only IT Agents, Team Leads, and Admins can update status/assignment
        if (user.role === client_1.Role.EMPLOYEE) {
            throw new index_js_1.ForbiddenError('Employees cannot modify ticket status or assignment.');
        }
        const now = new Date();
        if (input.status && input.status !== ticket.status) {
            ticket.history.push({
                id: (0, crypto_1.randomUUID)(),
                ticketId: ticket.id,
                actorId: user.id,
                fieldChanged: 'status',
                oldValue: ticket.status,
                newValue: input.status,
                createdAt: now
            });
            ticket.status = input.status;
            if (input.status === client_1.TicketStatus.RESOLVED) {
                ticket.resolvedAt = now;
            }
            if (input.status === client_1.TicketStatus.CLOSED) {
                ticket.closedAt = now;
            }
        }
        if (input.assigneeId !== undefined && input.assigneeId !== ticket.assigneeId) {
            ticket.history.push({
                id: (0, crypto_1.randomUUID)(),
                ticketId: ticket.id,
                actorId: user.id,
                fieldChanged: 'assigneeId',
                oldValue: ticket.assigneeId,
                newValue: input.assigneeId,
                createdAt: now
            });
            ticket.assigneeId = input.assigneeId;
            if (ticket.status === client_1.TicketStatus.NEW) {
                ticket.status = client_1.TicketStatus.ASSIGNED;
            }
        }
        if (input.priority && input.priority !== ticket.priority) {
            ticket.history.push({
                id: (0, crypto_1.randomUUID)(),
                ticketId: ticket.id,
                actorId: user.id,
                fieldChanged: 'priority',
                oldValue: ticket.priority,
                newValue: input.priority,
                createdAt: now
            });
            ticket.priority = input.priority;
            ticket.slaDueAt = calculateSlaDeadline(input.priority);
        }
        if (input.title)
            ticket.title = input.title;
        if (input.description)
            ticket.description = input.description;
        if (input.category)
            ticket.category = input.category;
        if (input.assetId !== undefined)
            ticket.assetId = input.assetId;
        ticket.updatedAt = now;
        store_js_1.store.logAction('TICKET_UPDATED', 'Ticket', ticket.id, user.id, input);
        return ticket;
    }
    addComment(ticketId, input, user) {
        const ticket = store_js_1.store.tickets.find((t) => t.id === ticketId);
        if (!ticket) {
            throw new index_js_1.NotFoundError(`Ticket '${ticketId}' was not found.`);
        }
        // Role check for internal comments: Employees cannot post or view internal notes
        if (input.isInternal && user.role === client_1.Role.EMPLOYEE) {
            throw new index_js_1.ForbiddenError('Employees are not authorized to author internal work notes.');
        }
        // If employee, can only comment on own tickets
        if (user.role === client_1.Role.EMPLOYEE && ticket.creatorId !== user.id) {
            throw new index_js_1.ForbiddenError('You can only comment on your own tickets.');
        }
        const comment = {
            id: (0, crypto_1.randomUUID)(),
            ticketId: ticket.id,
            authorId: user.id,
            content: input.content,
            isInternal: !!input.isInternal,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        ticket.comments.push(comment);
        ticket.updatedAt = new Date();
        store_js_1.store.logAction('TICKET_COMMENT_ADDED', 'Ticket', ticket.id, user.id, {
            commentId: comment.id,
            isInternal: comment.isInternal
        });
        return comment;
    }
}
exports.TicketsService = TicketsService;
exports.ticketsService = new TicketsService();
