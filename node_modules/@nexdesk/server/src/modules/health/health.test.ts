import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../../app.js';
import { Server } from 'http';

describe('Health Check Endpoint (GET /api/v1/health)', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        if (typeof addr === 'object' && addr !== null) {
          baseUrl = `http://127.0.0.1:${addr.port}`;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('should return 200 OK with healthy status and metadata', async () => {
    const response = await fetch(`${baseUrl}/api/v1/health`);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.status).toBe('healthy');
    expect(body.checks.system).toBe('ok');
    expect(typeof body.uptimeSeconds).toBe('number');
    expect(typeof body.timestamp).toBe('string');
  });

  it('should include correlation ID header (X-Request-ID)', async () => {
    const response = await fetch(`${baseUrl}/api/v1/health`);
    expect(response.headers.get('x-request-id')).toBeTruthy();
  });

  it('should return 404 RFC 7807 problem details for non-existent routes', async () => {
    const response = await fetch(`${baseUrl}/api/v1/unknown-route`);
    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body.title).toBe('Not Found');
    expect(body.status).toBe(404);
    expect(body.type).toBe('https://api.edunex.internal/errors/not-found');
    expect(body.requestId).toBeTruthy();
  });
});
