"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardService = exports.DashboardService = void 0;
const client_1 = require("@prisma/client");
const store_js_1 = require("../../common/db/store.js");
class DashboardService {
    getMetrics(user) {
        const now = new Date();
        if (user.role === client_1.Role.EMPLOYEE) {
            const myTickets = store_js_1.store.tickets.filter((t) => t.creatorId === user.id);
            const openCount = myTickets.filter((t) => t.status !== client_1.TicketStatus.RESOLVED && t.status !== client_1.TicketStatus.CLOSED).length;
            const resolvedCount = myTickets.filter((t) => t.status === client_1.TicketStatus.RESOLVED || t.status === client_1.TicketStatus.CLOSED).length;
            const myAssetsCount = store_js_1.store.assets.filter((a) => a.assignedToUserId === user.id).length;
            const myLicensesCount = store_js_1.store.licenses.reduce((acc, l) => acc + l.allocations.filter((a) => a.userId === user.id).length, 0);
            return {
                role: user.role,
                summary: {
                    openTickets: openCount,
                    resolvedTickets: resolvedCount,
                    assignedHardware: myAssetsCount,
                    activeLicenses: myLicensesCount
                },
                recentTickets: myTickets.slice(0, 5).map((t) => ({
                    id: t.id,
                    ticketNumber: t.ticketNumber,
                    title: t.title,
                    priority: t.priority,
                    status: t.status,
                    createdAt: t.createdAt.toISOString(),
                    slaDueAt: t.slaDueAt.toISOString(),
                    isOverdue: now > t.slaDueAt && t.status !== client_1.TicketStatus.RESOLVED && t.status !== client_1.TicketStatus.CLOSED
                }))
            };
        }
        if (user.role === client_1.Role.IT_AGENT) {
            const unassignedCount = store_js_1.store.tickets.filter((t) => t.assigneeId === null).length;
            const myActiveTickets = store_js_1.store.tickets.filter((t) => t.assigneeId === user.id &&
                t.status !== client_1.TicketStatus.RESOLVED &&
                t.status !== client_1.TicketStatus.CLOSED);
            const approachingSlaCount = store_js_1.store.tickets.filter((t) => {
                const isNotClosed = t.status !== client_1.TicketStatus.RESOLVED && t.status !== client_1.TicketStatus.CLOSED;
                const hoursRemaining = (t.slaDueAt.getTime() - now.getTime()) / (1000 * 60 * 60);
                return isNotClosed && hoursRemaining <= 4 && hoursRemaining > 0;
            }).length;
            const overdueCount = store_js_1.store.tickets.filter((t) => now > t.slaDueAt &&
                t.status !== client_1.TicketStatus.RESOLVED &&
                t.status !== client_1.TicketStatus.CLOSED).length;
            return {
                role: user.role,
                summary: {
                    unassignedQueue: unassignedCount,
                    myAssignedTickets: myActiveTickets.length,
                    approachingSla: approachingSlaCount,
                    overdueTickets: overdueCount
                },
                recentTickets: store_js_1.store.tickets.slice(0, 5).map((t) => ({
                    id: t.id,
                    ticketNumber: t.ticketNumber,
                    title: t.title,
                    priority: t.priority,
                    status: t.status,
                    createdAt: t.createdAt.toISOString(),
                    slaDueAt: t.slaDueAt.toISOString(),
                    isOverdue: now > t.slaDueAt && t.status !== client_1.TicketStatus.RESOLVED && t.status !== client_1.TicketStatus.CLOSED
                }))
            };
        }
        // TEAM_LEAD and ADMIN
        const totalTickets = store_js_1.store.tickets.length;
        const openTickets = store_js_1.store.tickets.filter((t) => t.status !== client_1.TicketStatus.RESOLVED && t.status !== client_1.TicketStatus.CLOSED).length;
        const overdueCount = store_js_1.store.tickets.filter((t) => now > t.slaDueAt &&
            t.status !== client_1.TicketStatus.RESOLVED &&
            t.status !== client_1.TicketStatus.CLOSED).length;
        const compliantCount = store_js_1.store.tickets.filter((t) => {
            if (t.resolvedAt)
                return t.resolvedAt <= t.slaDueAt;
            return now <= t.slaDueAt;
        }).length;
        const slaRate = totalTickets > 0 ? Math.round((compliantCount / totalTickets) * 100) : 100;
        const inStockAssets = store_js_1.store.assets.filter((a) => a.status === client_1.AssetStatus.IN_STOCK).length;
        const assignedAssets = store_js_1.store.assets.filter((a) => a.status === client_1.AssetStatus.ASSIGNED).length;
        const inRepairAssets = store_js_1.store.assets.filter((a) => a.status === client_1.AssetStatus.IN_REPAIR).length;
        return {
            role: user.role,
            summary: {
                totalTickets,
                openTickets,
                overdueTickets: overdueCount,
                slaComplianceRate: `${slaRate}%`,
                totalUsers: store_js_1.store.users.length,
                totalAssets: store_js_1.store.assets.length
            },
            assetOverview: {
                inStock: inStockAssets,
                assigned: assignedAssets,
                inRepair: inRepairAssets
            },
            recentTickets: store_js_1.store.tickets.slice(0, 5).map((t) => ({
                id: t.id,
                ticketNumber: t.ticketNumber,
                title: t.title,
                priority: t.priority,
                status: t.status,
                createdAt: t.createdAt.toISOString(),
                slaDueAt: t.slaDueAt.toISOString(),
                isOverdue: now > t.slaDueAt && t.status !== client_1.TicketStatus.RESOLVED && t.status !== client_1.TicketStatus.CLOSED
            }))
        };
    }
}
exports.DashboardService = DashboardService;
exports.dashboardService = new DashboardService();
