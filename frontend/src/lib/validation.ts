import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

export const platformLoginSchema = loginSchema;
export const tenantLoginSchema = loginSchema.extend({
  workspaceSlug: z.string().min(1, 'Workspace slug is required')
});
export const clientLoginSchema = loginSchema;

export const createClientSchema = z.object({
  name: z.string().min(1, 'Client name is required').max(255, 'Name too long'),
  contactName: z.string().max(255).optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  address: z.string().optional(),
  taxId: z.string().max(100).optional()
});

export const createSupplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required').max(255, 'Name too long'),
  contactName: z.string().max(255).optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  address: z.string().optional(),
  paymentTerms: z.string().optional(),
  leadTimeDays: z.number().int().positive('Lead time must be positive').default(7),
  taxId: z.string().max(100).optional()
});

export const createProductSchema = z.object({
  sku: z.string().min(1, 'SKU is required').max(100, 'SKU too long'),
  name: z.string().min(1, 'Product name is required').max(255, 'Name too long'),
  description: z.string().optional(),
  unit: z.string().min(1, 'Unit is required').max(50, 'Unit too long'),
  category: z.string().max(100).optional(),
  specification: z.string().optional()
});

export const createProjectSchema = z.object({
  clientId: z.string().min(1, 'Client is required'),
  quoteId: z.string().optional(),
  title: z.string().min(1, 'Project title is required').max(255, 'Title too long'),
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled']).optional(),
  startDate: z.string().optional(),
  targetEndDate: z.string().optional(),
  quotedTotalMinor: z.number().positive('Quoted total must be positive').optional()
});

export const validatePasswordStrength = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) errors.push('Password must be at least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('Password must contain uppercase letters');
  if (!/[a-z]/.test(password)) errors.push('Password must contain lowercase letters');
  if (!/[0-9]/.test(password)) errors.push('Password must contain numbers');
  if (!/[!@#$%^&*]/.test(password)) errors.push('Password must contain special characters');
  
  return {
    valid: errors.length === 0,
    errors
  };
};