import { z } from 'zod';

export const emailSchema = z.string().email('Invalid email format');
export const passwordSchema = z.string().min(8, 'Password must be at least 8 characters');
export const uuidSchema = z.string().uuid('Invalid UUID format');
export const dateSchema = z.string().or(z.date());
export const booleanSchema = z.boolean();
export const numberSchema = z.number();