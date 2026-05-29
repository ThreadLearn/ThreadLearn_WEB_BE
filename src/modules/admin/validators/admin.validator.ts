import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const optionalBooleanQuery = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true')
  .optional();

export const objectIdParamSchema = z.string().regex(objectIdRegex, 'Invalid ObjectId format.');

export const createStudentSchema = z.object({
  email: z.string().email('Invalid email address format.'),
  password: z.string().min(6, 'Password must be at least 6 characters long.').optional(),
  firstName: z.string().trim().min(1, 'First name is required.'),
  lastName: z.string().trim().min(1, 'Last name is required.'),
});

export const listStudentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  isActive: optionalBooleanQuery,
  isVerified: optionalBooleanQuery,
});

export const updateStudentSchema = z
  .object({
    firstName: z.string().trim().min(1, 'First name is required.').optional(),
    lastName: z.string().trim().min(1, 'Last name is required.').optional(),
    avatarUrl: z.string().trim().min(1, 'Avatar URL is required.').optional(),
    isVerified: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one student field must be provided.',
  });

export const lockStudentSchema = z.object({
  lockedReason: z.string().trim().max(500, 'Locked reason must be at most 500 characters.').optional(),
});
