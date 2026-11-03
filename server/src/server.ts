import { createApp } from './app.js';
import { config } from './common/config/index.js';
import { store } from './common/db/store.js';

const app = createApp();

const server = app.listen(config.PORT, config.HOST, async () => {
  console.log(`🚀 EDUNEX Academic Server listening at http://${config.HOST}:${config.PORT}`);
  console.log(`👉 Health check endpoint: http://${config.HOST}:${config.PORT}/api/v1/health`);
  console.log(`🔒 Environment: ${config.NODE_ENV}`);
  
  // Initialize store and ensure Super Admin is bootstrapped
  await store.init();
});

function gracefulShutdown(signal: string) {
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
