import { z } from 'zod';

export const loginSchema = z
  .object({
    identifier: z.string().optional(),
    email: z.string().optional(),
    password: z.string().min(1, 'Password is required.')
  })
  .refine((data) => Boolean((data.identifier && data.identifier.trim()) || (data.email && data.email.trim())), {
    message: 'Please provide a valid User ID, mobile number, or email address.',
    path: ['identifier']
  })
  .transform((data) => ({
    identifier: ((data.identifier && data.identifier.trim()) || (data.email && data.email.trim()) || ''),
    password: data.password
  }));

export type LoginInput = z.infer<typeof loginSchema>;

export const googleAuthSchema = z.object({
  googleId: z.string().min(1, 'Google provider identity is required.'),
  email: z.string().email('Valid Google email is required.').trim().toLowerCase(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  avatarUrl: z.string().optional().nullable(),
  idToken: z.string().optional(),
  accessToken: z.string().optional()
});

export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;

export const firebaseAuthSchema = z.object({
  idToken: z.string().min(1, 'Firebase identity token is required.')
});

export type FirebaseAuthInput = z.infer<typeof firebaseAuthSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required.'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters long.')
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
