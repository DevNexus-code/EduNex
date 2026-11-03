import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../app.js';
import { Server } from 'http';
import { store } from '../common/db/store.js';

describe('EDUNEX Student & Staff Query Filtering and Prisma Fix Test Suite', () => {
  let server: Server;
  let baseUrl: string;
  let adminCookie: string;
  let sampleCourseId: string;
  let sampleDepartmentId: string;

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

    // Fetch existing department and course for valid ID tests
    const deptsRes = await fetch(`${baseUrl}/api/v1/academics/departments`, {
      headers: { Cookie: adminCookie }
    });
    const depts = await deptsRes.json();
    if (depts.data && depts.data.length > 0) {
      sampleDepartmentId = depts.data[0].id;
    }

    const coursesRes = await fetch(`${baseUrl}/api/v1/academics/courses`, {
      headers: { Cookie: adminCookie }
    });
    const courses = await coursesRes.json();
    if (courses.data && courses.data.length > 0) {
      sampleCourseId = courses.data[0].id;
    }
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  // ============================================================================
  // STUDENT API TESTS
  // ============================================================================
  describe('Student Query & Filter Validation', () => {
    it('1. GET /api/v1/students with no query parameters returns 200 and data array', async () => {
      const res = await fetch(`${baseUrl}/api/v1/students`, {
        headers: { Cookie: adminCookie }
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('2. GET /api/v1/students with valid search filter returns 200', async () => {
      const res = await fetch(`${baseUrl}/api/v1/students?search=STU`, {
        headers: { Cookie: adminCookie }
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('3. GET /api/v1/students with valid status returns 200', async () => {
      const res = await fetch(`${baseUrl}/api/v1/students?status=ACTIVE`, {
        headers: { Cookie: adminCookie }
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('4. GET /api/v1/students with valid courseId returns 200', async () => {
      const courseParam = sampleCourseId || '00000000-0000-0000-0000-000000000001';
      const res = await fetch(`${baseUrl}/api/v1/students?courseId=${courseParam}`, {
        headers: { Cookie: adminCookie }
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('5. GET /api/v1/students with multiple valid filters returns 200', async () => {
      const res = await fetch(`${baseUrl}/api/v1/students?status=ACTIVE&search=John`, {
        headers: { Cookie: adminCookie }
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('6. GET /api/v1/students with empty filter values safely ignores them and returns 200', async () => {
      const res = await fetch(`${baseUrl}/api/v1/students?status=&search=&courseId=`, {
        headers: { Cookie: adminCookie }
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('7. GET /api/v1/students with literal "undefined" safely ignores them and returns 200 without Prisma crash', async () => {
      const res = await fetch(
        `${baseUrl}/api/v1/students?courseId=undefined&status=undefined&search=undefined`,
        { headers: { Cookie: adminCookie } }
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('8. GET /api/v1/students with null-like values safely ignores them and returns 200', async () => {
      const res = await fetch(
        `${baseUrl}/api/v1/students?courseId=null&status=null&search=null`,
        { headers: { Cookie: adminCookie } }
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('9. GET /api/v1/students with invalid StudentStatus returns 400 validation error', async () => {
      const res = await fetch(`${baseUrl}/api/v1/students?status=INVALID_STATUS`, {
        headers: { Cookie: adminCookie }
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.field).toBe('status');
      expect(body.message).toContain('Invalid student status filter');
    });

    it('10. GET /api/v1/students with invalid courseId UUID format returns 400', async () => {
      const res = await fetch(`${baseUrl}/api/v1/students?courseId=not-a-valid-uuid`, {
        headers: { Cookie: adminCookie }
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.field).toBe('courseId');
      expect(body.message).toContain('Invalid courseId identifier format');
    });
  });

  // ============================================================================
  // STAFF API TESTS
  // ============================================================================
  describe('Staff Query & Filter Validation', () => {
    it('1. GET /api/v1/staff with no query parameters returns 200 and data array', async () => {
      const res = await fetch(`${baseUrl}/api/v1/staff`, {
        headers: { Cookie: adminCookie }
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('2. GET /api/v1/staff with valid search filter returns 200', async () => {
      const res = await fetch(`${baseUrl}/api/v1/staff?search=Professor`, {
        headers: { Cookie: adminCookie }
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('3. GET /api/v1/staff with valid category returns 200', async () => {
      const res = await fetch(`${baseUrl}/api/v1/staff?category=TEACHING`, {
        headers: { Cookie: adminCookie }
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('4. GET /api/v1/staff with valid departmentId returns 200', async () => {
      const deptParam = sampleDepartmentId || '00000000-0000-0000-0000-000000000001';
      const res = await fetch(`${baseUrl}/api/v1/staff?departmentId=${deptParam}`, {
        headers: { Cookie: adminCookie }
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('5. GET /api/v1/staff with valid status returns 200', async () => {
      const res = await fetch(`${baseUrl}/api/v1/staff?status=ACTIVE`, {
        headers: { Cookie: adminCookie }
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('6. GET /api/v1/staff with multiple valid filters returns 200', async () => {
      const res = await fetch(`${baseUrl}/api/v1/staff?category=TEACHING&status=ACTIVE`, {
        headers: { Cookie: adminCookie }
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('7. GET /api/v1/staff with empty filter values safely ignores them and returns 200', async () => {
      const res = await fetch(
        `${baseUrl}/api/v1/staff?category=&departmentId=&status=&search=`,
        { headers: { Cookie: adminCookie } }
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('8. GET /api/v1/staff with literal "undefined" safely ignores them and returns 200 without Prisma crash', async () => {
      const res = await fetch(
        `${baseUrl}/api/v1/staff?category=undefined&departmentId=undefined&status=undefined&search=undefined`,
        { headers: { Cookie: adminCookie } }
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('9. GET /api/v1/staff with null-like values safely ignores them and returns 200', async () => {
      const res = await fetch(
        `${baseUrl}/api/v1/staff?category=null&departmentId=null&status=null&search=null`,
        { headers: { Cookie: adminCookie } }
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('10. GET /api/v1/staff with invalid StaffCategory returns 400 validation error', async () => {
      const res = await fetch(`${baseUrl}/api/v1/staff?category=INVALID_CATEGORY`, {
        headers: { Cookie: adminCookie }
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.field).toBe('category');
      expect(body.message).toContain('Invalid staff category filter');
    });

    it('11. GET /api/v1/staff with invalid StaffStatus returns 400 validation error', async () => {
      const res = await fetch(`${baseUrl}/api/v1/staff?status=INVALID_STATUS`, {
        headers: { Cookie: adminCookie }
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.field).toBe('status');
      expect(body.message).toContain('Invalid staff status filter');
    });

    it('12. GET /api/v1/staff with invalid departmentId UUID format returns 400', async () => {
      const res = await fetch(`${baseUrl}/api/v1/staff?departmentId=not-a-valid-uuid`, {
        headers: { Cookie: adminCookie }
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.field).toBe('departmentId');
      expect(body.message).toContain('Invalid departmentId identifier format');
    });
  });
});
