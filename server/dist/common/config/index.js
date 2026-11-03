"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
dotenv_1.default.config();
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'test', 'production']).default('development'),
    PORT: zod_1.z.coerce.number().default(5000),
    HOST: zod_1.z.string().default('0.0.0.0'),
    CORS_ORIGIN: zod_1.z.string().default('http://localhost:5173'),
    DATABASE_URL: zod_1.z
        .string()
        .optional()
        .default('postgresql://nexdesk_user:nexdesk_dev_password@localhost:5432/nexdesk_dev?schema=public'),
    SESSION_SECRET: zod_1.z
        .string()
        .min(16)
        .default('dev_insecure_session_secret_replace_in_production_min_32_chars'),
    COOKIE_DOMAIN: zod_1.z.string().default('localhost'),
    COOKIE_SECURE: zod_1.z.coerce.boolean().default(false),
    LOG_LEVEL: zod_1.z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    SMTP_HOST: zod_1.z.string().optional(),
    SMTP_PORT: zod_1.z.coerce.number().optional().default(587),
    SMTP_USER: zod_1.z.string().optional(),
    SMTP_PASS: zod_1.z.string().optional(),
    SMTP_SECURE: zod_1.z.coerce.boolean().optional().default(false),
    EMAIL_FROM: zod_1.z.string().optional().default('EDUNEX Academic Platform <noreply@edunex.edu>'),
    APP_URL: zod_1.z.string().optional().default('http://localhost:5173')
});
const parsedEnv = envSchema.safeParse(process.env);
if (!parsedEnv.success) {
    // Output validation errors cleanly on startup
    console.error('Invalid environment configuration:', parsedEnv.error.format());
    throw new Error('Invalid environment configuration');
}
exports.config = parsedEnv.data;
