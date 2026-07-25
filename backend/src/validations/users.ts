import { z } from 'zod';
import { emailSchema, passwordSchema, uuidSchema } from './base';

export const createUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  roles: z.array(z.enum(['platform_admin', 'tenant_admin', 'estimator', 'procurement', 'project_manager', 'staff_viewer', 'client'])).default(['staff_viewer'])
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  roles: z.array(z.enum(['platform_admin', 'tenant_admin', 'estimator', 'procurement', 'project_manager', 'staff_viewer', 'client'])).optional(),
  is_active: z.boolean().optional()
});

export const resetPasswordSchema = z.object({
  userId: uuidSchema,
  newPassword: passwordSchema
});