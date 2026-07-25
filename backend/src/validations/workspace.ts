import { z } from 'zod';

export const createWorkspaceSchema = z.object({
  name: z.string().min(1, 'Workspace name is required').max(255, 'Name too long'),
  slug: z.string().min(1, 'Slug is required').max(100, 'Slug too long')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  reportingCurrency: z.string().length(3).default('KES'),
  defaultLocale: z.string().default('en-KE')
});

export const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  reportingCurrency: z.string().length(3).optional(),
  defaultLocale: z.string().optional()
});