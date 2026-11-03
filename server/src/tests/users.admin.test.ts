import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../app.js';
import { Server } from 'http';
import { store } from '../common/db/store.js';
import { prisma } from '../common/db/prisma.js';

describe('EDUNEX Admin User Governance Test Suite', () => {
  let server: Server;
  let baseUrl: string;
  let adminCookie: string;

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

    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@edunex.edu', password: 'Edunex@Admin2026' })
    });
    const body = await res.json();
    const setCookie = res.headers.get('set-cookie') || '';
    adminCookie = setCookie.split(';')[0];
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('GET /api/v1/users returns user directory', async () => {
    const res = await fetch(`${baseUrl}/api/v1/users`, {
      headers: { Cookie: adminCookie }
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('GET /api/v1/users/metrics returns role distributions', async () => {
    const res = await fetch(`${baseUrl}/api/v1/users/metrics`, {
      headers: { Cookie: adminCookie }
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveProperty('superAdmins');
    expect(body.data).toHaveProperty('teachers');
    expect(body.data).toHaveProperty('students');
  });

  it('POST /api/v1/users provisions new institutional account with temporary password', async () => {
    const testEmail = `teacher.${Date.now()}@edunex.edu`;
    const res = await fetch(`${baseUrl}/api/v1/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie
      },
      body: JSON.stringify({
        email: testEmail,
        firstName: 'Elena',
        lastName: 'Rostova',
        role: 'TEACHER',
        phone: '+1-555-0199'
      })
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.user.email).toBe(testEmail);
    expect(body.data.user.role).toBe('TEACHER');
    expect(body.data.temporaryPassword).toBeTruthy();
    expect(body.data.resetLink).toBeTruthy();

    // Clean up created test user immediately so synthetic records do not accumulate in the database
    if (body.data?.user?.id) {
      await prisma.user.delete({ where: { id: body.data.user.id } });
      store.removeUser(body.data.user.id);
    }
  }, 15000);

  it('GET /api/v1/users/me/profile returns current authenticated user profile', async () => {
    const res = await fetch(`${baseUrl}/api/v1/users/me/profile`, {
      headers: { Cookie: adminCookie }
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.email).toBe('admin@edunex.edu');
  });
});
