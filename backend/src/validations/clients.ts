import { z } from 'zod';
import { emailSchema } from './base';

export const createClientSchema = z.object({
  name: z.string().min(1, 'Client name is required').max(255, 'Name too long'),
  contactName: z.string().max(255).optional(),
  email: emailSchema.optional(),
  phone: z.string().max(50).optional(),
  address: z.string().optional(),
  taxId: z.string().max(100).optional()
});

export const updateClientSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  contactName: z.string().max(255).optional(),
  email: emailSchema.optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  address: z.string().optional(),
  taxId: z.string().max(100).optional(),
  is_active: z.boolean().optional()
});