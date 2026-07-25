import { z } from 'zod';
import { uuidSchema, dateSchema, numberSchema } from './base';

export const createQuoteSchema = z.object({
  clientId: uuidSchema,
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  description: z.string().optional(),
  validUntil: dateSchema.optional(),
  currency: z.string().length(3).default('KES')
});

export const updateQuoteSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  validUntil: dateSchema.optional(),
  status: z.enum(['draft', 'published', 'accepted', 'rejected', 'superseded']).optional(),
  currency: z.string().length(3).optional()
});

export const quoteItemSchema = z.object({
  quoteId: uuidSchema,
  productId: uuidSchema.optional(),
  description: z.string().min(1, 'Description is required'),
  quantity: numberSchema.positive('Quantity must be positive'),
  unitPrice: numberSchema.positive('Unit price must be positive'),
  discount: numberSchema.min(0).max(100).default(0)
});