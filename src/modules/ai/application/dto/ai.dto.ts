import { z } from '../../../../common/zod/z';

export const aiRecommendationSchema = z.object({
  codeExecutionId: z.string().optional(),
  inputCode: z.string().min(1, 'inputCode is required').max(5000, 'inputCode must not exceed 5000 characters'),
  language: z.string().default('javascript'),
});

export const feedbackSchema = z.object({
  feedbackRating: z.number().int().min(1).max(5),
});

export type AIRecommendationPayload = z.infer<typeof aiRecommendationSchema>;
export type FeedbackDto = z.infer<typeof feedbackSchema>;
