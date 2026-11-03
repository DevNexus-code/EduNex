import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../app.js';
import { Server } from 'http';
import { store } from '../common/db/store.js';

describe('EDUNEX Google OAuth Pre-Registration Test Suite', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    await store.init();

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

  it('rejects unprovisioned Google account with strict academic notice', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        googleId: 'unregistered-google-id-999',
        email: 'unregistered.student@gmail.com',
        firstName: 'Unregistered',
        lastName: 'Student'
      })
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.detail).toContain('Your account is not registered with EDUNEX');
  });

  it('authenticates pre-registered account matching existing email', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        googleId: 'admin-google-id-001',
        email: 'admin@edunex.edu',
        firstName: 'System',
        lastName: 'Administrator'
      })
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.user.email).toBe('admin@edunex.edu');
    expect(body.data.user.role).toBe('SUPER_ADMIN');
  });
});
