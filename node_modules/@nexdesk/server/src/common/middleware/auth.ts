import { Request, Response, NextFunction } from 'express';
import { Role } from '../db/prisma.js';
import { UnauthorizedError, ForbiddenError } from '../errors/index.js';
import { store } from '../db/store.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  departmentId: string | null;
  parentId?: string | null;
  phone?: string | null;
  address?: string | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function extractSessionToken(req: Request): string | null {
  if (req.cookies && (req.cookies.edunex_session || req.cookies.nexdesk_session)) {
    return req.cookies.edunex_session || req.cookies.nexdesk_session;
  }
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = extractSessionToken(req);

  if (!token) {
    return next(new UnauthorizedError('Authentication session missing or expired.'));
  }

  const session = store.getSession(token);
  if (!session) {
    return next(new UnauthorizedError('Invalid or expired session. Please sign in again.'));
  }

  let user = store.findUserById(session.userId);
  if (!user) {
    user = await store.fetchAndCacheUserById(session.userId);
  }
  if (!user || !user.isActive) {
    return next(new UnauthorizedError('User account is deactivated or not found.'));
  }

  req.user = {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    departmentId: user.departmentId || null,
    parentId: user.parentId || null,
    phone: user.phone || null,
    address: user.address || null
  };

  next();
}

export function requireRole(allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required.'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Access denied. Role '${req.user.role}' does not have sufficient permissions for this operation.`
        )
      );
    }

    next();
  };
}

export const authorize = requireRole;
