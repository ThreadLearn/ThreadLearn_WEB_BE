import { z } from 'zod';

export const requestAnalysisSchema = z.object({
  inputCode: z
    .string()
    .min(1, 'inputCode is required.')
    .max(5000, 'inputCode must be at most 5000 characters.'),
  language: z.string().min(1, 'language is required.'),
  codeExecutionId: z.string().optional(),
});
