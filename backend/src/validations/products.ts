import { z } from 'zod';

export const createProductSchema = z.object({
  sku: z.string().min(1, 'SKU is required').max(100, 'SKU too long'),
  name: z.string().min(1, 'Product name is required').max(255, 'Name too long'),
  description: z.string().optional(),
  unit: z.string().min(1, 'Unit is required').max(50, 'Unit too long'),
  category: z.string().max(100).optional(),
  specification: z.string().optional()
});

export const updateProductSchema = z.object({
  sku: z.string().min(1).max(100).optional(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  unit: z.string().min(1).max(50).optional(),
  category: z.string().max(100).optional(),
  specification: z.string().optional(),
  is_active: z.boolean().optional()
});