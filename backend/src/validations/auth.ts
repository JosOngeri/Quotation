import { z } from 'zod';
import { emailSchema, passwordSchema } from './base';

export const platformLoginSchema = z.object({
  email: emailSchema,
  password: passwordSchema
});

export const tenantLoginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  workspaceSlug: z.string().min(1, 'Workspace slug is required')
});

export const clientLoginSchema = z.object({
  email: emailSchema,
  password: passwordSchema
});

export const passwordResetSchema = z.object({
  email: emailSchema,
  token: z.string().min(1, 'Reset token is required'),
  newPassword: passwordSchema
});