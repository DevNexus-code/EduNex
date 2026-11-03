import { randomUUID } from 'crypto';
import { prisma, Role } from './prisma.js';
import { hashPassword } from '../utils/password.js';
import { getPhoneSearchVariants } from '../utils/phone.js';

export interface UserRecord {
  id: string;
  email: string;
  passwordHash?: string | null;
  firstName: string;
  lastName: string;
  role: Role;
  firebaseUid?: string | null;
  googleId?: string | null;
  avatarUrl?: string | null;
  phone?: string | null;
  staffId?: string | null;
  studentId?: string | null;
  parentId?: string | null;
  mustChangePassword?: boolean;
  designation?: string | null;
  gender?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  bio?: string | null;
  departmentId?: string | null;
  isActive: boolean;
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionRecord {
  id: string;
  userId: string;
  sessionToken: string;
  expiresAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date;
}

class EdunexStore {
  private sessions = new Map<string, SessionRecord>();
  private userCache = new Map<string, UserRecord>();
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    try {
      // Check if any admin exists
      const count = await prisma.user.count();
      if (count === 0) {
        console.log('[EDUNEX] No users found in database. Bootstrapping Super Admin...');
        const passwordHash = await hashPassword('Edunex@Admin2026');
        const defaultAdmin = await prisma.user.create({
          data: {
            id: randomUUID(),
            email: 'admin@edunex.edu',
            passwordHash,
            firstName: 'Super',
            lastName: 'Admin',
            role: 'SUPER_ADMIN' as Role,
            isActive: true,
            designation: 'Institutional Administrator',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });

        // Also create a sample Department
        const sampleDept = await prisma.department.create({
          data: {
            id: randomUUID(),
            name: 'Computer Science & Engineering',
            code: 'CSE',
            description: 'Department of Computer Science & Engineering',
            status: 'ACTIVE',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });

        // Create sample Academic Year
        const sampleYear = await prisma.academicYear.create({
          data: {
            id: randomUUID(),
            name: '2025-2026',
            startDate: new Date('2025-08-01'),
            endDate: new Date('2026-06-30'),
            isCurrent: true,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });

        // Create sample Course
        await prisma.course.create({
          data: {
            id: randomUUID(),
            name: 'Bachelor of Technology in Computer Science',
            code: 'BTECH-CSE',
            description: 'Four-year undergraduate degree in computer science.',
            durationYears: 4,
            type: 'UNDERGRADUATE',
            status: 'ACTIVE',
            departmentId: sampleDept.id,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });

        console.log(`[EDUNEX] Bootstrapped Super Admin (${defaultAdmin.email}) and foundational academic curriculum.`);
      }

      // Populate user cache
      const allUsers = await prisma.user.findMany();
      for (const u of allUsers) {
        this.cacheUser(u);
      }
      this.initialized = true;
    } catch (err) {
      console.error('[EDUNEX] Store initialization warning:', err);
    }
  }

  private cacheUser(user: any): UserRecord {
    const record: UserRecord = {
      id: user.id,
      email: user.email.toLowerCase(),
      passwordHash: user.passwordHash,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      firebaseUid: user.firebaseUid,
      googleId: user.googleId,
      avatarUrl: user.avatarUrl,
      phone: user.phone,
      staffId: user.staffId,
      studentId: user.studentId,
      parentId: user.parentId,
      mustChangePassword: Boolean(user.mustChangePassword),
      designation: user.designation,
      gender: user.gender,
      address: user.address,
      city: user.city,
      state: user.state,
      postalCode: user.postalCode,
      bio: user.bio,
      departmentId: user.departmentId,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
    this.userCache.set(record.id, record);
    this.userCache.set(record.email, record);
    if (record.studentId) this.userCache.set(record.studentId.toLowerCase(), record);
    if (record.staffId) this.userCache.set(record.staffId.toLowerCase(), record);
    if (record.parentId) this.userCache.set(record.parentId.toLowerCase(), record);
    return record;
  }

  createSession(userId: string, token: string, ipAddress?: string, userAgent?: string): SessionRecord {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const session: SessionRecord = {
      id: randomUUID(),
      userId,
      sessionToken: token,
      expiresAt,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      createdAt: new Date()
    };
    this.sessions.set(token, session);
    return session;
  }

  getSession(token: string): SessionRecord | null {
    const session = this.sessions.get(token);
    if (!session) return null;
    if (new Date() > session.expiresAt) {
      this.sessions.delete(token);
      return null;
    }
    return session;
  }

  deleteSession(token: string): void {
    this.sessions.delete(token);
  }

  findUserById(userId: string): UserRecord | null {
    return this.userCache.get(userId) || null;
  }

  findUserByEmail(email: string): UserRecord | null {
    return this.userCache.get(email.toLowerCase()) || null;
  }

  async fetchAndCacheUserByEmail(email: string): Promise<UserRecord | null> {
    try {
      const u = await prisma.user.findFirst({
        where: { email: email.toLowerCase() }
      });
      if (u) {
        return this.cacheUser(u);
      }
    } catch (e) {
      console.error('[EDUNEX] DB user lookup failed:', e);
    }
    return null;
  }

  async fetchAndCacheUserByIdentifier(identifier: string): Promise<UserRecord | null> {
    const trimmed = identifier.trim();
    if (!trimmed) return null;

    // First check in-memory cache
    const lower = trimmed.toLowerCase();
    for (const cached of this.userCache.values()) {
      if (
        cached.email.toLowerCase() === lower ||
        (cached.studentId && cached.studentId.toLowerCase() === lower) ||
        (cached.staffId && cached.staffId.toLowerCase() === lower) ||
        (cached.parentId && cached.parentId.toLowerCase() === lower) ||
        (cached.phone && (cached.phone === trimmed || cached.phone.endsWith(trimmed) || trimmed.endsWith(cached.phone)))
      ) {
        return cached;
      }
    }

    try {
      const phoneVariants = getPhoneSearchVariants(trimmed);

      // 1. Direct user table lookup
      let u = await prisma.user.findFirst({
        where: {
          OR: [
            { email: lower },
            { studentId: { equals: trimmed, mode: 'insensitive' } },
            { staffId: { equals: trimmed, mode: 'insensitive' } },
            { parentId: { equals: trimmed, mode: 'insensitive' } },
            ...phoneVariants.map((pv) => ({ phone: pv }))
          ]
        }
      });

      // 2. Lookup via Student record (e.g. admissionNumber or studentId)
      if (!u) {
        const student = await prisma.student.findFirst({
          where: {
            OR: [
              { admissionNumber: { equals: trimmed, mode: 'insensitive' } },
              { studentId: { equals: trimmed, mode: 'insensitive' } }
            ]
          },
          include: { User: true }
        });
        if (student?.User) {
          u = student.User;
        }
      }

      // 3. Lookup via ParentProfile record
      if (!u) {
        const parentProfile = await prisma.parentProfile.findFirst({
          where: {
            parentId: { equals: trimmed, mode: 'insensitive' }
          },
          include: { User: true }
        });
        if (parentProfile?.User) {
          u = parentProfile.User;
        }
      }

      if (u) {
        return this.cacheUser(u);
      }
    } catch (e) {
      console.error('[EDUNEX] Universal DB identifier lookup failed:', e);
    }

    return null;
  }

  async fetchAndCacheUserById(id: string): Promise<UserRecord | null> {
    try {
      const u = await prisma.user.findUnique({
        where: { id }
      });
      if (u) {
        return this.cacheUser(u);
      }
    } catch (e) {
      console.error('[EDUNEX] DB user lookup failed:', e);
    }
    return null;
  }

  async syncFirebaseUser(payload: { firebaseUid: string; email: string; avatarUrl?: string | null }): Promise<UserRecord> {
    const email = payload.email.toLowerCase();
    let existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { firebaseUid: payload.firebaseUid }
        ]
      }
    });

    if (!existing) {
      throw new Error('Your account is not registered with EDUNEX. Please contact your administrator.');
    }

    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        firebaseUid: payload.firebaseUid,
        avatarUrl: payload.avatarUrl || existing.avatarUrl,
        lastLoginAt: new Date()
      }
    });

    return this.cacheUser(updated);
  }

  async upsertGoogleUser(payload: {
    googleId: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
  }): Promise<{ user: UserRecord; isNew: boolean }> {
    const email = payload.email.toLowerCase();
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { googleId: payload.googleId }
        ]
      }
    });

    // Enforce pre-registration rule: reject if unprovisioned
    if (!existing) {
      throw new Error('Your account is not registered with EDUNEX. Please contact your administrator.');
    }

    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        googleId: payload.googleId,
        avatarUrl: payload.avatarUrl || existing.avatarUrl,
        lastLoginAt: new Date()
      }
    });

    return { user: this.cacheUser(updated), isNew: false };
  }

  async logAction(
    action: string,
    entityType: string,
    entityId: string,
    userId?: string,
    payload?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          id: randomUUID(),
          action,
          entityType,
          entityId,
          userId: userId || null,
          payload: payload ? JSON.parse(JSON.stringify(payload)) : null,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
          timestamp: new Date()
        }
      });
    } catch (err) {
      console.warn('[EDUNEX] Audit logging failed silently:', err);
    }
  }

  refreshUser(user: any): UserRecord {
    return this.cacheUser(user);
  }

  removeUser(idOrEmail: string): void {
    const user = this.userCache.get(idOrEmail) || this.userCache.get(idOrEmail.toLowerCase());
    if (user) {
      this.userCache.delete(user.id);
      this.userCache.delete(user.email.toLowerCase());
    } else {
      this.userCache.delete(idOrEmail);
      this.userCache.delete(idOrEmail.toLowerCase());
    }
  }
}

export const store = new EdunexStore();
