import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../app.js';
import { Server } from 'http';
import { store } from '../common/db/store.js';
import { prisma } from '../common/db/prisma.js';
import { otpService } from '../common/services/otp.service.js';
import { activationService } from '../common/services/activation.service.js';
import { emailService, devMailbox } from '../common/email/email.service.js';
import { randomUUID } from 'crypto';

describe('EDUNEX Email Automation, Account Credential Delivery & OTP Security System', () => {
  let server: Server;
  let baseUrl: string;
  let adminCookie: string;
  let testUserId: string;
  const testEmail = `test.user.${Date.now()}@edunex.edu`;

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

    // Authenticate Super Admin
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@edunex.edu', password: 'Edunex@Admin2026' })
    });
    const setCookie = res.headers.get('set-cookie') || '';
    adminCookie = setCookie.split(';')[0];
  }, 20000);

  afterAll(async () => {
    // Clean up created test records
    if (testUserId) {
      await prisma.otpChallenge.deleteMany({ where: { userId: testUserId } });
      await prisma.accountActivationToken.deleteMany({ where: { userId: testUserId } });
      await prisma.emailNotificationLog.deleteMany({ where: { userId: testUserId } });
      await prisma.user.deleteMany({ where: { id: testUserId } });
    }
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  describe('1. OTP Service & Cryptographic Security', () => {
    let challengeId: string;
    let plaintextOtp: string;

    it('generates a 6-digit OTP and hashes it in Supabase DB without storing plaintext', async () => {
      const challenge = await otpService.createChallenge({
        email: testEmail,
        purpose: 'LOGIN_VERIFICATION',
        userName: 'Test User'
      });

      expect(challenge.challengeId).toBeDefined();
      expect(challenge.expiresInSeconds).toBe(300);
      expect(challenge.recipientMasked).toContain('***');
      expect(challenge.recipientMasked).toContain('@edunex.edu');

      challengeId = challenge.challengeId;

      // Verify that plain text OTP is NOT stored in the database
      const dbRecord = await prisma.otpChallenge.findUnique({
        where: { id: challengeId }
      });
      expect(dbRecord).not.toBeNull();
      expect(dbRecord?.otpHash).toBeDefined();
      // Length of HMAC-SHA256 hex is 64 characters
      expect(dbRecord?.otpHash.length).toBe(64);
      expect(dbRecord?.isConsumed).toBe(false);

      // Plaintext OTP was dispatched to the devMailbox
      const lastMail = devMailbox[devMailbox.length - 1];
      expect(lastMail.to).toBe(testEmail.toLowerCase());
      const otpMatch = lastMail.text?.match(/\b(\d{6})\b/);
      expect(otpMatch).not.toBeNull();
      plaintextOtp = otpMatch![1];
      expect(plaintextOtp.length).toBe(6);
    }, 15000);

    it('rejects an invalid OTP and increments attempt count', async () => {
      expect(challengeId).toBeDefined();
      await expect(
        otpService.verifyChallenge({
          challengeId,
          otp: '000000',
          purpose: 'LOGIN_VERIFICATION'
        })
      ).rejects.toThrow();

      const dbRecord = await prisma.otpChallenge.findUnique({
        where: { id: challengeId }
      });
      expect(dbRecord?.attempts).toBe(1);
    }, 15000);

    it('prevents resend spam during 60-second cooldown', async () => {
      await expect(
        otpService.createChallenge({
          email: testEmail,
          purpose: 'LOGIN_VERIFICATION'
        })
      ).rejects.toThrow(/wait \d+ seconds/i);
    }, 15000);

    it('successfully verifies a valid OTP and marks it consumed (single-use)', async () => {
      expect(challengeId).toBeDefined();
      expect(plaintextOtp).toBeDefined();

      const verified = await otpService.verifyChallenge({
        challengeId,
        otp: plaintextOtp,
        purpose: 'LOGIN_VERIFICATION'
      });

      expect(verified.email).toBe(testEmail.toLowerCase());

      const dbRecord = await prisma.otpChallenge.findUnique({
        where: { id: challengeId }
      });
      expect(dbRecord?.isConsumed).toBe(true);
      expect(dbRecord?.consumedAt).not.toBeNull();

      // Attempting to reuse the exact same OTP should fail immediately
      await expect(
        otpService.verifyChallenge({
          challengeId,
          otp: plaintextOtp,
          purpose: 'LOGIN_VERIFICATION'
        })
      ).rejects.toThrow(/already been used/i);
    }, 15000);
  });

  describe('2. Account Activation Token Service', () => {
    let activationToken: string;

    beforeAll(async () => {
      // Create a test user in DB
      testUserId = randomUUID();
      await prisma.user.create({
        data: {
          id: testUserId,
          email: testEmail,
          passwordHash: 'dummy-initial-hash',
          firstName: 'Sarah',
          lastName: 'Connor',
          role: 'TEACHER',
          isActive: true,
          isEmailVerified: false,
          mustChangePassword: true,
          staffId: `STF-${Date.now().toString().slice(-4)}`,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }, 15000);

    it('generates a 64-character activation token hashed with SHA-256', async () => {
      activationToken = await activationService.createActivationToken(testUserId, testEmail, 72);
      expect(activationToken.length).toBe(64);

      // Verify that plaintext token is NOT stored in the database
      const dbTokens = await prisma.accountActivationToken.findMany({
        where: { userId: testUserId }
      });
      expect(dbTokens.length).toBeGreaterThan(0);
      const tokenRecord = dbTokens[0];
      expect(tokenRecord.tokenHash).not.toBe(activationToken);
      expect(tokenRecord.tokenHash.length).toBe(64);
      expect(tokenRecord.isConsumed).toBe(false);
    }, 15000);

    it('pre-validates the token via verifyActivationToken without consuming it', async () => {
      const res = await activationService.verifyActivationToken(activationToken);
      expect(res.valid).toBe(true);
      expect(res.user?.email).toBe(testEmail);
      expect(res.user?.firstName).toBe('Sarah');
      expect(res.user?.lastName).toBe('Connor');
      expect(res.user?.role).toBe('TEACHER');

      // Ensure it is still unconsumed
      const dbTokens = await prisma.accountActivationToken.findMany({
        where: { userId: testUserId }
      });
      expect(dbTokens[0].isConsumed).toBe(false);
    }, 15000);

    it('rejects an invalid or tampered activation token', async () => {
      const tampered = activationToken.slice(0, -4) + 'abcd';
      const res = await activationService.verifyActivationToken(tampered);
      expect(res.valid).toBe(false);
      expect(res.error).toBeDefined();
    }, 15000);

    it('completes account activation, sets new Argon2 password, and consumes token', async () => {
      const newPassword = 'SecureCampusPassword@2026';
      const result = await activationService.completeActivation(activationToken, newPassword);

      expect(result.userId).toBe(testUserId);
      expect(result.email).toBe(testEmail);

      // Verify user in database
      const user = await prisma.user.findUnique({ where: { id: testUserId } });
      expect(user?.isEmailVerified).toBe(true);
      expect(user?.emailVerifiedAt).not.toBeNull();
      expect(user?.mustChangePassword).toBe(false);
      expect(user?.passwordHash).not.toBe('dummy-initial-hash');

      // Attempting to reuse the token must now fail
      await expect(
        activationService.completeActivation(activationToken, 'AnotherPassword!123')
      ).rejects.toThrow();
    }, 20000);
  });

  describe('3. Automated Credential Delivery & Email Notifications', () => {
    it('dispatches student admission confirmation email to dev mailbox', async () => {
      const admissionRes = await emailService.sendAdmissionConfirmationEmail({
        to: testEmail,
        userId: testUserId,
        studentName: 'Alex Mercer',
        studentId: 'STU-99991',
        admissionNumber: 'ADM-2026-9991',
        departmentName: 'Computer Science',
        courseName: 'B.Tech CS',
        sectionName: 'Cohort A',
        academicSession: '2026-2027',
        admissionDate: 'November 3, 2026',
        activationToken: 'test-token-value'
      });

      expect(admissionRes.success).toBe(true);

      const log = await prisma.emailNotificationLog.findUnique({
        where: { id: admissionRes.logId }
      });
      expect(log).not.toBeNull();
      expect(log?.notificationType).toBe('STUDENT_ADMISSION_CONFIRMATION');
      expect(log?.status).toBe('SENT');
      expect(log?.subject).toContain('Student Admission Confirmation');
    }, 15000);

    it('flags internal accounts without email as manual delivery required without fake email', async () => {
      const res = await emailService.sendAccountActivationEmail({
        to: 'internal-user@internal.edunex.local',
        userId: testUserId,
        name: 'Internal User',
        loginId: 'STF-INTERNAL',
        role: 'STAFF',
        activationToken: 'token-xyz',
        expiresHours: 72
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('valid external email');

      const log = await prisma.emailNotificationLog.findUnique({
        where: { id: res.logId }
      });
      expect(log?.status).toBe('FAILED');
      expect(log?.errorMessage).toContain('Manual credential delivery required');
    }, 15000);
  });

  describe('4. Administrative Notification Audit Center & Retry API', () => {
    it('GET /api/v1/notifications returns notification audit logs for Admin', async () => {
      const res = await fetch(`${baseUrl}/api/v1/notifications?search=${encodeURIComponent(testEmail)}`, {
        headers: { Cookie: adminCookie }
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);
      expect(body.data[0].recipient).toBe(testEmail.toLowerCase());
    }, 15000);

    it('GET /api/v1/notifications/metrics returns summary counts', async () => {
      const res = await fetch(`${baseUrl}/api/v1/notifications/metrics`, {
        headers: { Cookie: adminCookie }
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.total).toBeGreaterThan(0);
      expect(body.data.sent).toBeDefined();
      expect(body.data.provider).toBeDefined();
    }, 15000);

    it('POST /api/v1/notifications/:id/retry triggers notification re-delivery', async () => {
      const logs = await prisma.emailNotificationLog.findMany({
        where: { recipient: testEmail.toLowerCase() },
        take: 1
      });
      expect(logs.length).toBeGreaterThan(0);

      const targetLog = logs[0];
      const initialRetries = targetLog.retryCount;

      const res = await fetch(`${baseUrl}/api/v1/notifications/${targetLog.id}/retry`, {
        method: 'POST',
        headers: { Cookie: adminCookie }
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.success).toBe(true);

      const updated = await prisma.emailNotificationLog.findUnique({
        where: { id: targetLog.id }
      });
      expect(updated?.retryCount).toBe(initialRetries + 1);
    }, 15000);
  });
});
