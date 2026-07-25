import { z } from 'zod';
import { emailSchema } from './base';

export const createSupplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required').max(255, 'Name too long'),
  contactName: z.string().max(255).optional(),
  email: emailSchema.optional(),
  phone: z.string().max(50).optional(),
  address: z.string().optional(),
  paymentTerms: z.string().optional(),
  leadTimeDays: z.number().int().positive().default(7),
  taxId: z.string().max(100).optional()
});

export const updateSupplierSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  contactName: z.string().max(255).optional(),
  email: emailSchema.optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  address: z.string().optional(),
  paymentTerms: z.string().optional(),
  leadTimeDays: z.number().int().positive().optional(),
  taxId: z.string().max(100).optional(),
  is_active: z.boolean().optional()
});