import { z } from 'zod';
import { uuidSchema, dateSchema, numberSchema } from './base';

export const createProjectSchema = z.object({
  clientId: uuidSchema,
  quoteId: uuidSchema.optional(),
  title: z.string().min(1, 'Project title is required').max(255, 'Title too long'),
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled']).optional(),
  startDate: dateSchema.optional(),
  targetEndDate: dateSchema.optional(),
  quotedTotalMinor: numberSchema.positive('Quoted total must be positive').optional()
});

export const updateProjectSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled']).optional(),
  startDate: dateSchema.optional(),
  targetEndDate: dateSchema.optional(),
  actualEndDate: dateSchema.optional()
});

export const costEventSchema = z.object({
  projectId: uuidSchema,
  type: z.enum(['actual', 'substitution', 'addition']),
  description: z.string().min(1, 'Description is required'),
  amount: numberSchema,
  date: dateSchema,
  relatedQuoteItemId: uuidSchema.optional()
});