"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_js_1 = require("./app.js");
const index_js_1 = require("./common/config/index.js");
const store_js_1 = require("./common/db/store.js");
const app = (0, app_js_1.createApp)();
const server = app.listen(index_js_1.config.PORT, index_js_1.config.HOST, async () => {
    console.log(`🚀 EDUNEX Academic Server listening at http://${index_js_1.config.HOST}:${index_js_1.config.PORT}`);
    console.log(`👉 Health check endpoint: http://${index_js_1.config.HOST}:${index_js_1.config.PORT}/api/v1/health`);
    console.log(`🔒 Environment: ${index_js_1.config.NODE_ENV}`);
    // Initialize store and ensure Super Admin is bootstrapped
    await store_js_1.store.init();
});
function gracefulShutdown(signal) {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`);
    server.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
    });
    // Force close if taking longer than 10s
    setTimeout(() => {
        console.error('Forced shutdown due to timeout.');
        process.exit(1);
    }, 10000);
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
