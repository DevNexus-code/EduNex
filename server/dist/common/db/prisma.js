"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
exports.checkDatabaseConnection = checkDatabaseConnection;
exports.getDatabaseConnectedStatus = getDatabaseConnectedStatus;
const index_js_1 = require("./generated/client/index.js");
__exportStar(require("./generated/client/index.js"), exports);
exports.prisma = global.__prisma ||
    new index_js_1.PrismaClient({
        log: [
            { emit: 'event', level: 'query' },
            { emit: 'event', level: 'error' },
            { emit: 'event', level: 'warn' }
        ]
    });
if (process.env.NODE_ENV !== 'production') {
    global.__prisma = exports.prisma;
}
let isDatabaseConnected = false;
async function checkDatabaseConnection() {
    try {
        await exports.prisma.$queryRaw `SELECT 1`;
        isDatabaseConnected = true;
        return true;
    }
    catch {
        isDatabaseConnected = false;
        return false;
    }
}
function getDatabaseConnectedStatus() {
    return isDatabaseConnected;
}
