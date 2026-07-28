import { z } from '../../../../common/zod/z';

export const aiRecommendationSchema = z.object({
  codeExecutionId: z.string().optional(),
  inputCode: z.string().min(1, 'inputCode is required').max(5000, 'inputCode must not exceed 5000 characters'),
  language: z.string().default('javascript'),
});

export const feedbackSchema = z.object({
  feedbackRating: z.number().int().min(1).max(5),
});

export const aiHistoryIdParamSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid AI history id.');

export const aiHistoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type AIHistoryQuery = z.infer<typeof aiHistoryQuerySchema>;

export type AIRecommendationPayload = z.infer<typeof aiRecommendationSchema>;
export type FeedbackDto = z.infer<typeof feedbackSchema>;
