"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAssetsController = listAssetsController;
exports.getAssetByIdController = getAssetByIdController;
exports.createAssetController = createAssetController;
exports.assignAssetController = assignAssetController;
exports.returnAssetController = returnAssetController;
exports.listLicensesController = listLicensesController;
exports.allocateLicenseController = allocateLicenseController;
const assets_service_js_1 = require("./assets.service.js");
const index_js_1 = require("../../common/errors/index.js");
function getParamId(req) {
    return Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
}
function listAssetsController(req, res, next) {
    try {
        if (!req.user)
            throw new index_js_1.UnauthorizedError();
        const assets = assets_service_js_1.assetsService.listAssets(req.user, req.query);
        res.status(200).json({
            success: true,
            data: { assets }
        });
    }
    catch (error) {
        next(error);
    }
}
function getAssetByIdController(req, res, next) {
    try {
        if (!req.user)
            throw new index_js_1.UnauthorizedError();
        const id = getParamId(req);
        const asset = assets_service_js_1.assetsService.getAssetById(id, req.user);
        res.status(200).json({
            success: true,
            data: { asset }
        });
    }
    catch (error) {
        next(error);
    }
}
function createAssetController(req, res, next) {
    try {
        if (!req.user)
            throw new index_js_1.UnauthorizedError();
        const asset = assets_service_js_1.assetsService.createAsset(req.body, req.user);
        res.status(201).json({
            success: true,
            data: { asset }
        });
    }
    catch (error) {
        next(error);
    }
}
function assignAssetController(req, res, next) {
    try {
        if (!req.user)
            throw new index_js_1.UnauthorizedError();
        const id = getParamId(req);
        const asset = assets_service_js_1.assetsService.assignAsset(id, req.body.userId, req.body.notes, req.user);
        res.status(200).json({
            success: true,
            data: { asset }
        });
    }
    catch (error) {
        next(error);
    }
}
function returnAssetController(req, res, next) {
    try {
        if (!req.user)
            throw new index_js_1.UnauthorizedError();
        const id = getParamId(req);
        const asset = assets_service_js_1.assetsService.returnAsset(id, req.body.conditionAtReturn, req.body.notes, req.user);
        res.status(200).json({
            success: true,
            data: { asset }
        });
    }
    catch (error) {
        next(error);
    }
}
function listLicensesController(_req, res, next) {
    try {
        const licenses = assets_service_js_1.assetsService.listLicenses();
        res.status(200).json({
            success: true,
            data: { licenses }
        });
    }
    catch (error) {
        next(error);
    }
}
function allocateLicenseController(req, res, next) {
    try {
        if (!req.user)
            throw new index_js_1.UnauthorizedError();
        const id = getParamId(req);
        const license = assets_service_js_1.assetsService.allocateLicense(id, req.body.userId, req.body.assetId, req.user);
        res.status(200).json({
            success: true,
            data: { license }
        });
    }
    catch (error) {
        next(error);
    }
}
