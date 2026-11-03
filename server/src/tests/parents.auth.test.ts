import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../app.js';
import { Server } from 'http';
import { store } from '../common/db/store.js';
import { prisma } from '../common/db/prisma.js';

describe('EDUNEX Parent Management & Universal ID-Based Authentication Test Suite', { timeout: 60000 }, () => {
  let server: Server;
  let baseUrl: string;
  let adminCookie: string;
  let testDepartmentId: string;
  let testCourseId: string;

  // Generated during test execution
  let student1Id: string;
  let student1Code: string;
  let student1Pass: string;
  let parent1Id: string;
  let parent1Phone = '9876543210';
  let parent1Pass: string;
  let parent1Cookie: string;

  let student2Code: string;

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

    // 1. Admin login to obtain session cookie
    const adminLoginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'admin@edunex.edu', password: 'Edunex@Admin2026' })
    });
    const setCookie = adminLoginRes.headers.get('set-cookie') || '';
    adminCookie = setCookie.split(';')[0];

    // 2. Fetch existing course and department for admissions
    const course = await prisma.course.findFirst({
      include: { Department: true }
    });
    if (course) {
      testCourseId = course.id;
      testDepartmentId = course.departmentId;
    }
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('1. Admits Student 1 with new parent mobile (no parent email provided)', async () => {
    // Generate a unique Indian 10-digit mobile starting with 9
    const random9Digits = Math.floor(100000000 + Math.random() * 900000000);
    parent1Phone = `9${random9Digits}`;
    const uniqueEmail = `test.student.${Date.now()}@edunex.edu`;

    const payload = {
      firstName: 'Aarav',
      lastName: 'Verma',
      email: uniqueEmail,
      phone: '9811223344',
      gender: 'Male',
      departmentId: testDepartmentId,
      courseId: testCourseId,
      admissionDate: new Date().toISOString().split('T')[0],
      // Parent Information directly in student admission (without email)
      parentMode: 'NEW',
      parentName: 'Sanjay Verma',
      parentRelationship: 'Father',
      parentPhone: parent1Phone,
      parentOccupation: 'Engineer'
    };

    const res = await fetch(`${baseUrl}/api/v1/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie
      },
      body: JSON.stringify(payload)
    });

    const body = await res.json();
    if (res.status !== 201) {
      console.error('Test 1 Admission Error:', body);
    }
    expect(res.status).toBe(201);
    const data = body.data;

    expect(data).toHaveProperty('student');
    expect(data).toHaveProperty('credentials');

    const creds = data.credentials;
    // Verify auto-generated IDs and credentials
    expect(creds.studentId).toMatch(/^STD-\d{4}-\d{4}$/);
    expect(creds.studentAdmissionNumber).toMatch(/^ADM-\d{4}-\d{4}$/);
    expect(creds.studentTemporaryPassword).toBeDefined();

    expect(creds.parentId).toMatch(/^PRN-\d{4}-\d{4}$/);
    expect(creds.parentName).toBe('Sanjay Verma');
    expect(creds.parentPhone).toContain(parent1Phone);
    expect(creds.parentTemporaryPassword).toBeDefined();
    expect(creds.parentAccountStatus).toBe('CREATED');

    student1Id = data.student.id;
    student1Code = creds.studentId;
    student1Pass = creds.studentTemporaryPassword;
    parent1Id = creds.parentId;
    parent1Pass = creds.parentTemporaryPassword;
  });

  it('2. Admits Student 2 with the same parent mobile -> atomically links to existing parent', async () => {
    const uniqueEmail2 = `test.student2.${Date.now()}@edunex.edu`;

    const payload = {
      firstName: 'Diya',
      lastName: 'Verma',
      email: uniqueEmail2,
      gender: 'Female',
      departmentId: testDepartmentId,
      courseId: testCourseId,
      admissionDate: new Date().toISOString().split('T')[0],
      // Same parent mobile number
      parentMode: 'NEW',
      parentName: 'Sanjay Verma',
      parentRelationship: 'Father',
      parentPhone: parent1Phone
    };

    const res = await fetch(`${baseUrl}/api/v1/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie
      },
      body: JSON.stringify(payload)
    });

    const body = await res.json();
    if (res.status !== 201) {
      console.error('Test 1 Admission Error:', body);
    }
    expect(res.status).toBe(201);
    const creds = body.data.credentials;

    // Must link to the same parent account
    expect(creds.parentId).toBe(parent1Id);
    expect(creds.parentAccountStatus).toBe('LINKED_EXISTING');
    student2Code = creds.studentId;
  });

  it('3. Universal Login: Parent logs in with Parent ID + Temporary Password', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: parent1Id,
        password: parent1Pass
      })
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.user.role).toBe('PARENT');
    expect(body.data.user.parentId).toBe(parent1Id);

    const setCookie = res.headers.get('set-cookie') || '';
    parent1Cookie = setCookie.split(';')[0];
  });

  it('4. Universal Login: Parent logs in with Registered Mobile Number + Password', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: parent1Phone,
        password: parent1Pass
      })
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.user.role).toBe('PARENT');
    const setCookie = res.headers.get('set-cookie') || '';
    if (setCookie) parent1Cookie = setCookie.split(';')[0];
  });

  it('5. Universal Login: Student logs in with Student ID + Temporary Password', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: student1Code,
        password: student1Pass
      })
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.user.role).toBe('STUDENT');
    expect(body.data.user.studentId).toBe(student1Code);
  });

  it('6. Parent Portal: GET /api/v1/parents/portal/my-children returns both linked children', async () => {
    const res = await fetch(`${baseUrl}/api/v1/parents/portal/my-children`, {
      headers: { Cookie: parent1Cookie }
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    const children = body.data.children;

    expect(Array.isArray(children)).toBe(true);
    expect(children.length).toBeGreaterThanOrEqual(2);

    const studentCodes = children.map((c: any) => c.studentId);
    expect(studentCodes).toContain(student1Code);
    expect(studentCodes).toContain(student2Code);
  });

  it('7. Parent Portal: GET /api/v1/parents/portal/child/:studentId/summary returns child academic record', async () => {
    const res = await fetch(`${baseUrl}/api/v1/parents/portal/child/${student1Code}/summary`, {
      headers: { Cookie: parent1Cookie }
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.student.studentId).toBe(student1Code);
    expect(body.data).toHaveProperty('metrics');
    expect(body.data).toHaveProperty('attendance');
    expect(body.data).toHaveProperty('feePayments');
    expect(body.data).toHaveProperty('marks');
  });

  it('8. Security Isolation: Parent CANNOT access academic records of an unlinked student', async () => {
    // Find a student not belonging to parent1
    if (student1Code) {
      const otherStudent = await prisma.student.findFirst({
        where: {
          NOT: [
            { studentId: student1Code },
            ...(student2Code ? [{ studentId: student2Code }] : [])
          ]
        }
      });

      if (otherStudent) {
        const res = await fetch(`${baseUrl}/api/v1/parents/portal/child/${otherStudent.studentId}/summary`, {
          headers: { Cookie: parent1Cookie }
        });
        // Must be 403 Forbidden
        expect(res.status).toBe(403);
      }
    }
  });

  it('9. Password Change: Parent updates temporary password to a permanent one', async () => {
    const newPassword = 'Secure@Parent2026!';
    const changeRes = await fetch(`${baseUrl}/api/v1/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: parent1Cookie
      },
      body: JSON.stringify({
        currentPassword: parent1Pass,
        newPassword
      })
    });

    expect(changeRes.status).toBe(200);

    // Old password should now fail
    const oldLoginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: parent1Id,
        password: parent1Pass
      })
    });
    expect(oldLoginRes.status).toBe(401);

    // New password should succeed
    const newLoginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: parent1Id,
        password: newPassword
      })
    });
    expect(newLoginRes.status).toBe(200);
  });

  it('10. Admin Parent Directory & Password Reset: Admin lists parents and resets credentials', async () => {
    // List parents
    const listRes = await fetch(`${baseUrl}/api/v1/parents?search=${parent1Phone}`, {
      headers: { Cookie: adminCookie }
    });
    expect(listRes.status).toBe(200);
    const listBody = await listRes.json();
    expect(listBody.data.length).toBeGreaterThanOrEqual(1);

    const parentProfileId = listBody.data[0].id;

    // Reset password
    const resetRes = await fetch(`${baseUrl}/api/v1/parents/${parentProfileId}/reset-password`, {
      method: 'POST',
      headers: { Cookie: adminCookie }
    });
    expect(resetRes.status).toBe(200);
    const resetBody = await resetRes.json();
    expect(resetBody.data.temporaryPassword).toBeDefined();

    // Verify login with new temporary password
    const loginWithResetRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: parent1Id,
        password: resetBody.data.temporaryPassword
      })
    });
    expect(loginWithResetRes.status).toBe(200);
  });
});
