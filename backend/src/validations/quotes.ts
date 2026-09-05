import { z } from 'zod';
import { uuidSchema, dateSchema } from './base';

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

// ---------------------------------------------------------------------------
// Quote hierarchy: nodes + items
// ---------------------------------------------------------------------------

export const createQuoteNodeSchema = z.object({
  parentNodeId: uuidSchema.optional(),
  nodeType: z.enum(['section', 'subsection', 'item']),
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  description: z.string().optional(),
  ordinal: z.number().int().optional()
});

export const updateQuoteNodeSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  ordinal: z.number().int().optional(),
  parentNodeId: uuidSchema.nullable().optional()
});

export const createQuoteItemSchema = z.object({
  productId: uuidSchema.optional(),
  supplierOfferId: uuidSchema.optional(),
  quantity: z.number().int().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required').max(50),
  unitCostMinor: z.number().int().min(0, 'Unit cost must be >= 0'),
  sellPriceMinor: z.number().int().min(0).optional(),
  taxRate: z.number().min(0).max(1).optional(),
  currency: z.string().length(3).optional(),
  pricingRule: z.string().max(50).optional(),
  markupValueMinor: z.number().int().optional()
});

export const updateQuoteItemSchema = z.object({
  productId: uuidSchema.nullable().optional(),
  supplierOfferId: uuidSchema.nullable().optional(),
  quantity: z.number().int().positive().optional(),
  unit: z.string().min(1).max(50).optional(),
  unitCostMinor: z.number().int().min(0).optional(),
  sellPriceMinor: z.number().int().min(0).optional(),
  taxRate: z.number().min(0).max(1).optional(),
  currency: z.string().length(3).optional(),
  pricingRule: z.string().max(50).nullable().optional(),
  markupValueMinor: z.number().int().nullable().optional()
});

// ---------------------------------------------------------------------------
// Templates, comments, approvals
// ---------------------------------------------------------------------------

export const createQuoteTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().optional(),
  structure: z.array(z.any()).or(z.record(z.any()))
});

export const updateQuoteTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  structure: z.array(z.any()).or(z.record(z.any())).optional(),
  isActive: z.boolean().optional()
});

export const applyQuoteTemplateSchema = z.object({
  quoteId: uuidSchema
});

export const quoteCommentSchema = z.object({
  body: z.string().min(1, 'Comment body is required')
});

export const approvalActionSchema = z.object({
  note: z.string().optional()
});
