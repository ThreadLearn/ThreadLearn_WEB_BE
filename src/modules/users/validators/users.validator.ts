import { z } from 'zod';

export const updateProfileSchema = z
  .object({
    firstName: z.string().trim().min(1, 'First name is required.').optional(),
    lastName: z.string().trim().min(1, 'Last name is required.').optional(),
    avatarUrl: z.string().trim().min(1, 'Avatar URL is required.').optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one profile field must be provided.',
  });
