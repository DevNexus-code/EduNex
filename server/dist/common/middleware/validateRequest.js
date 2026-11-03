"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = validateRequest;
const zod_1 = require("zod");
const index_js_1 = require("../errors/index.js");
function validateRequest(schemas) {
    return async (req, _res, next) => {
        try {
            if (schemas.body) {
                req.body = await schemas.body.parseAsync(req.body);
            }
            if (schemas.query) {
                req.query = await schemas.query.parseAsync(req.query);
            }
            if (schemas.params) {
                req.params = await schemas.params.parseAsync(req.params);
            }
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const invalidParams = error.errors.map((err) => ({
                    name: err.path.join('.'),
                    reason: err.message
                }));
                next(new index_js_1.ValidationError('Request validation failed.', invalidParams));
            }
            else {
                next(error);
            }
        }
    };
}
