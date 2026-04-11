import { z } from 'zod';

export const CreateOrgSchema = z.object({
  name: z.string().min(2),
  domain: z.string().optional(),
});

export const PasswordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const RegisterUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: PasswordSchema,
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR_MANAGER', 'IT_MANAGER', 'TEAM_LEAD', 'EMPLOYEE', 'GUEST']),
  organizationId: z.string().uuid(),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});
