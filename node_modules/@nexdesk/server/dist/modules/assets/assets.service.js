"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assetsService = exports.AssetsService = void 0;
const crypto_1 = require("crypto");
const client_1 = require("@prisma/client");
const store_js_1 = require("../../common/db/store.js");
const index_js_1 = require("../../common/errors/index.js");
class AssetsService {
    listAssets(user, filters) {
        let items = [...store_js_1.store.assets];
        // Role-based scoping: Employees see only their assigned assets
        if (user.role === client_1.Role.EMPLOYEE) {
            items = items.filter((a) => a.assignedToUserId === user.id);
        }
        if (filters?.status) {
            items = items.filter((a) => a.status === filters.status);
        }
        if (filters?.category) {
            items = items.filter((a) => a.category === filters.category);
        }
        if (filters?.search) {
            const q = filters.search.toLowerCase();
            items = items.filter((a) => a.assetTag.toLowerCase().includes(q) ||
                a.serialNumber.toLowerCase().includes(q) ||
                a.name.toLowerCase().includes(q) ||
                a.model.toLowerCase().includes(q));
        }
        return items.map((a) => {
            const assignedUser = a.assignedToUserId ? store_js_1.store.findUserById(a.assignedToUserId) : null;
            return {
                ...a,
                assignedUserName: assignedUser ? `${assignedUser.firstName} ${assignedUser.lastName}` : null
            };
        });
    }
    getAssetById(id, user) {
        const asset = store_js_1.store.assets.find((a) => a.id === id || a.assetTag === id);
        if (!asset) {
            throw new index_js_1.NotFoundError(`Asset '${id}' was not found.`);
        }
        if (user.role === client_1.Role.EMPLOYEE && asset.assignedToUserId !== user.id) {
            throw new index_js_1.ForbiddenError('You do not have permission to view this asset.');
        }
        const assignedUser = asset.assignedToUserId ? store_js_1.store.findUserById(asset.assignedToUserId) : null;
        return {
            ...asset,
            assignedUserName: assignedUser ? `${assignedUser.firstName} ${assignedUser.lastName}` : null
        };
    }
    createAsset(input, user) {
        const duplicateTag = store_js_1.store.assets.find((a) => a.assetTag.toLowerCase() === input.assetTag.toLowerCase());
        if (duplicateTag) {
            throw new index_js_1.ConflictError(`Asset with tag '${input.assetTag}' already exists.`);
        }
        const duplicateSerial = store_js_1.store.assets.find((a) => a.serialNumber.toLowerCase() === input.serialNumber.toLowerCase());
        if (duplicateSerial) {
            throw new index_js_1.ConflictError(`Asset with serial number '${input.serialNumber}' already exists.`);
        }
        const asset = {
            id: (0, crypto_1.randomUUID)(),
            assetTag: input.assetTag,
            serialNumber: input.serialNumber,
            name: input.name,
            category: input.category,
            model: input.model,
            manufacturer: input.manufacturer,
            status: client_1.AssetStatus.IN_STOCK,
            assignedToUserId: null,
            purchaseDate: input.purchaseDate ? new Date(input.purchaseDate) : null,
            purchaseCost: input.purchaseCost || null,
            warrantyExpiresAt: input.warrantyExpiresAt ? new Date(input.warrantyExpiresAt) : null,
            notes: input.notes || null,
            createdAt: new Date(),
            updatedAt: new Date(),
            assignmentHistory: []
        };
        store_js_1.store.assets.unshift(asset);
        store_js_1.store.logAction('ASSET_CREATED', 'Asset', asset.id, user.id, {
            assetTag: asset.assetTag,
            name: asset.name
        });
        return asset;
    }
    assignAsset(assetId, targetUserId, notes, actorUser) {
        const asset = store_js_1.store.assets.find((a) => a.id === assetId);
        if (!asset) {
            throw new index_js_1.NotFoundError(`Asset '${assetId}' was not found.`);
        }
        const recipient = store_js_1.store.findUserById(targetUserId);
        if (!recipient) {
            throw new index_js_1.NotFoundError(`Target user '${targetUserId}' was not found.`);
        }
        const now = new Date();
        asset.status = client_1.AssetStatus.ASSIGNED;
        asset.assignedToUserId = recipient.id;
        asset.updatedAt = now;
        asset.assignmentHistory.unshift({
            id: (0, crypto_1.randomUUID)(),
            assetId: asset.id,
            userId: recipient.id,
            assignedById: actorUser.id,
            assignedAt: now,
            returnedAt: null,
            conditionAtReturn: null,
            notes: notes || null
        });
        store_js_1.store.logAction('ASSET_ASSIGNED', 'Asset', asset.id, actorUser.id, {
            recipientId: recipient.id,
            recipientName: `${recipient.firstName} ${recipient.lastName}`,
            notes
        });
        return asset;
    }
    returnAsset(assetId, condition, notes, actorUser) {
        const asset = store_js_1.store.assets.find((a) => a.id === assetId);
        if (!asset) {
            throw new index_js_1.NotFoundError(`Asset '${assetId}' was not found.`);
        }
        const now = new Date();
        const activeHistory = asset.assignmentHistory.find((h) => h.returnedAt === null);
        if (activeHistory) {
            activeHistory.returnedAt = now;
            activeHistory.conditionAtReturn = condition;
            if (notes) {
                activeHistory.notes = activeHistory.notes ? `${activeHistory.notes} | Return Note: ${notes}` : notes;
            }
        }
        asset.status = client_1.AssetStatus.IN_STOCK;
        asset.assignedToUserId = null;
        asset.updatedAt = now;
        store_js_1.store.logAction('ASSET_RETURNED', 'Asset', asset.id, actorUser.id, {
            condition,
            notes
        });
        return asset;
    }
    listLicenses() {
        return store_js_1.store.licenses;
    }
    allocateLicense(licenseId, targetUserId, assetId, actorUser) {
        const license = store_js_1.store.licenses.find((l) => l.id === licenseId);
        if (!license) {
            throw new index_js_1.NotFoundError(`Software license '${licenseId}' was not found.`);
        }
        if (license.allocatedSeats >= license.totalSeats) {
            throw new index_js_1.ConflictError(`Software license '${license.name}' has reached its total capacity of ${license.totalSeats} seats.`);
        }
        const user = store_js_1.store.findUserById(targetUserId);
        if (!user) {
            throw new index_js_1.NotFoundError(`User '${targetUserId}' was not found.`);
        }
        license.allocatedSeats += 1;
        license.allocations.push({
            id: (0, crypto_1.randomUUID)(),
            licenseId: license.id,
            userId: user.id,
            assetId: assetId || null,
            allocatedAt: new Date(),
            revokedAt: null
        });
        license.updatedAt = new Date();
        store_js_1.store.logAction('LICENSE_SEAT_ALLOCATED', 'SoftwareLicense', license.id, actorUser.id, {
            userId: user.id,
            assetId
        });
        return license;
    }
}
exports.AssetsService = AssetsService;
exports.assetsService = new AssetsService();
