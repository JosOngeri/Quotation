import { z } from 'zod';
import { uuidSchema } from './base';

export const createProductSchema = z.object({
  sku: z.string().min(1, 'SKU is required').max(100, 'SKU too long'),
  name: z.string().min(1, 'Product name is required').max(255, 'Name too long'),
  description: z.string().optional(),
  unit: z.string().min(1, 'Unit is required').max(50, 'Unit too long'),
  category: z.string().max(100).optional(),
  specification: z.string().optional(),
  categoryId: uuidSchema.optional(),
  varietyId: uuidSchema.optional()
});

export const updateProductSchema = z.object({
  sku: z.string().min(1).max(100).optional(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  unit: z.string().min(1).max(50).optional(),
  category: z.string().max(100).optional(),
  specification: z.string().optional(),
  categoryId: uuidSchema.nullable().optional(),
  varietyId: uuidSchema.nullable().optional(),
  is_active: z.boolean().optional(),
  isActive: z.boolean().optional()
});

// Product category schemas
export const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(255, 'Name too long'),
  description: z.string().optional(),
  parentId: uuidSchema.nullable().optional()
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  parentId: uuidSchema.nullable().optional(),
  isActive: z.boolean().optional()
});

// Product variety schemas
export const createVarietySchema = z.object({
  categoryId: uuidSchema,
  name: z.string().min(1, 'Variety name is required').max(255, 'Name too long'),
  attributes: z.record(z.any()).optional()
});

export const updateVarietySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  attributes: z.record(z.any()).nullable().optional(),
  isActive: z.boolean().optional()
});
