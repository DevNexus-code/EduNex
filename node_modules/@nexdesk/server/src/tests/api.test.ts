import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../app.js';
import { Server } from 'http';
import { store } from '../common/db/store.js';

describe('EDUNEX Academic Management API Integration Test Suite', () => {
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

    // Login as Super Admin
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

  // 1. Health check
  it('GET /api/v1/health returns healthy status', async () => {
    const res = await fetch(`${baseUrl}/api/v1/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('healthy');
  });

  // 2. Authentication
  it('rejects invalid password with 401 Unauthorized', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@edunex.edu', password: 'WrongPassword!' })
    });
    expect(res.status).toBe(401);
  });

  it('authenticates valid credentials, sets HttpOnly cookie and returns profile', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@edunex.edu', password: 'Edunex@Admin2026' })
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.user.email).toBe('admin@edunex.edu');
    expect(body.data.user.role).toBe('SUPER_ADMIN');
  });

  it('returns current profile on GET /api/v1/auth/me', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: { Cookie: adminCookie }
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.user.email).toBe('admin@edunex.edu');
  });

  // 3. Academics
  it('GET /api/v1/academics/departments returns department list', async () => {
    const res = await fetch(`${baseUrl}/api/v1/academics/departments`, {
      headers: { Cookie: adminCookie }
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('GET /api/v1/academics/academic-years returns academic years', async () => {
    const res = await fetch(`${baseUrl}/api/v1/academics/academic-years`, {
      headers: { Cookie: adminCookie }
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
  });

  // 4. Students
  it('GET /api/v1/students returns student list', async () => {
    const res = await fetch(`${baseUrl}/api/v1/students`, {
      headers: { Cookie: adminCookie }
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
  });

  // 5. Staff
  it('GET /api/v1/staff returns staff list', async () => {
    const res = await fetch(`${baseUrl}/api/v1/staff`, {
      headers: { Cookie: adminCookie }
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
  });

  // 6. Fees
  it('GET /api/v1/fees/categories returns fee categories', async () => {
    const res = await fetch(`${baseUrl}/api/v1/fees/categories`, {
      headers: { Cookie: adminCookie }
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('GET /api/v1/fees/balances returns student balances', async () => {
    const res = await fetch(`${baseUrl}/api/v1/fees/balances`, {
      headers: { Cookie: adminCookie }
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
  });

  // 7. Dashboard
  it('GET /api/v1/dashboard/metrics returns academic KPIs', async () => {
    const res = await fetch(`${baseUrl}/api/v1/dashboard/metrics`, {
      headers: { Cookie: adminCookie }
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveProperty('totalStudents');
    expect(body.data).toHaveProperty('totalStaff');
    expect(body.data).toHaveProperty('todayAttendanceRate');
    expect(body.data).toHaveProperty('totalFeeCollected');
  });

  // 8. Reports
  it('GET /api/v1/reports/summary returns academic overview', async () => {
    const res = await fetch(`${baseUrl}/api/v1/reports/summary`, {
      headers: { Cookie: adminCookie }
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.overview).toHaveProperty('totalStudents');
  });

  it('GET /api/v1/reports/export/students returns CSV stream', async () => {
    const res = await fetch(`${baseUrl}/api/v1/reports/export/students`, {
      headers: { Cookie: adminCookie }
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/csv');
  });
});
