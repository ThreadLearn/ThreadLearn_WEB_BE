import { z } from 'zod';

export const updateProfileSchema = z
  .object({
    firstName: z.string().trim().min(1, 'First name is required.').max(50, 'First name must be at most 50 characters.').optional(),
    lastName: z.string().trim().min(1, 'Last name is required.').max(50, 'Last name must be at most 50 characters.').optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one profile field must be provided.',
  });
