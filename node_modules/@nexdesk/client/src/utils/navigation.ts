import { Role } from '../types';

/**
 * Maps a user's role to their designated institutional dashboard path.
 */
export const getRoleDashboardPath = (role?: Role | string | null): string => {
  switch (role) {
    case 'SUPER_ADMIN':
    case 'ADMIN':
      return '/admin/dashboard';
    case 'PRINCIPAL':
      return '/principal/dashboard';
    case 'TEACHER':
      return '/teacher/dashboard';
    case 'STAFF':
      return '/staff/dashboard';
    case 'STUDENT':
      return '/student/dashboard';
    case 'PARENT':
      return '/parent/dashboard';
    default:
      return '/admin/dashboard';
  }
};

/**
 * Checks if the given path is any role dashboard or root dashboard.
 */
export const isDashboardPath = (path: string): boolean => {
  return (
    path === '/' ||
    path === '/dashboard' ||
    path.endsWith('/dashboard')
  );
};
