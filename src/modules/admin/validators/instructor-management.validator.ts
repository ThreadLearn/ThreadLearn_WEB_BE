import { z } from 'zod';

const optionalBooleanQuery = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true')
  .optional();

export const createInstructorSchema = z.object({
  email: z.string().email('Invalid email address format.'),
  firstName: z.string().trim().min(1, 'First name is required.'),
  lastName: z.string().trim().min(1, 'Last name is required.'),
});

export const listInstructorsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  isActive: optionalBooleanQuery,
  isVerified: optionalBooleanQuery,
});

export const updateInstructorSchema = z
  .object({
    firstName: z.string().trim().min(1, 'First name is required.').optional(),
    lastName: z.string().trim().min(1, 'Last name is required.').optional(),
    avatarUrl: z.string().trim().min(1, 'Avatar URL is required.').optional(),
    isVerified: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one instructor field must be provided.',
  });

export const lockInstructorSchema = z.object({
  lockedReason: z
    .string()
    .trim()
    .max(500, 'Locked reason must be at most 500 characters.')
    .optional(),
});
