import { z } from 'zod';
import { Role } from '@prisma/client';

export const createUserSchema = z.object({
  email: z.string().email('Please provide a valid corporate email address.').trim().toLowerCase(),
  firstName: z.string().min(1, 'First name is required.').trim(),
  lastName: z.string().min(1, 'Last name is required.').trim(),
  role: z.nativeEnum(Role, {
    errorMap: () => ({ message: 'Role must be ADMIN, TEAM_LEAD, IT_AGENT, or EMPLOYEE.' })
  }),
  password: z.string().min(8, 'Temporary password must be at least 8 characters long.').optional(),
  sendInvite: z.boolean().default(true),
  departmentId: z.string().uuid().optional().nullable()
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  firstName: z.string().min(1).trim().optional(),
  lastName: z.string().min(1).trim().optional(),
  role: z.nativeEnum(Role).optional(),
  isActive: z.boolean().optional(),
  departmentId: z.string().uuid().optional().nullable()
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const userFilterSchema = z.object({
  search: z.string().optional(),
  role: z.nativeEnum(Role).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  departmentId: z.string().uuid().optional()
});

export type UserFilterInput = z.infer<typeof userFilterSchema>;
