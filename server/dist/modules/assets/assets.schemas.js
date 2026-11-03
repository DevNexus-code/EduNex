"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.allocateLicenseSchema = exports.returnAssetSchema = exports.assignAssetSchema = exports.updateAssetSchema = exports.createAssetSchema = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
exports.createAssetSchema = zod_1.z.object({
    assetTag: zod_1.z.string().min(3).max(30).trim(),
    serialNumber: zod_1.z.string().min(3).max(60).trim(),
    name: zod_1.z.string().min(2).max(100).trim(),
    category: zod_1.z.nativeEnum(client_1.AssetCategory),
    model: zod_1.z.string().min(1).max(80).trim(),
    manufacturer: zod_1.z.string().min(1).max(80).trim(),
    purchaseDate: zod_1.z.string().optional(),
    purchaseCost: zod_1.z.number().positive().optional(),
    warrantyExpiresAt: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional()
});
exports.updateAssetSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(100).optional(),
    status: zod_1.z.nativeEnum(client_1.AssetStatus).optional(),
    notes: zod_1.z.string().optional(),
    warrantyExpiresAt: zod_1.z.string().optional()
});
exports.assignAssetSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid('Valid user UUID is required.'),
    notes: zod_1.z.string().optional()
});
exports.returnAssetSchema = zod_1.z.object({
    conditionAtReturn: zod_1.z.string().min(2).max(100).default('GOOD'),
    notes: zod_1.z.string().optional()
});
exports.allocateLicenseSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid(),
    assetId: zod_1.z.string().uuid().optional().nullable()
});
