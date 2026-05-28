import { z } from 'zod';

export const runCodeSchema = z.object({
  exerciseId: z.string().min(1, 'exerciseId is required.'),
  code: z.string().min(1, 'code is required.'),
  language: z.enum(['javascript', 'python'], {
    required_error: 'language is required.',
    invalid_type_error: "language must be 'javascript' or 'python'.",
  }),
});
