import { z } from '../../../../common/zod/z';

export const aiRecommendationSchema = z.object({
  courseId: z.string().optional(),
  lessonId: z.string().optional(),
  codeExecutionId: z.string().optional(),
  inputCode: z.string().max(50000).optional(),
  language: z.string().optional(),
  prompt: z.string().max(4000).optional(),
});

export const feedbackSchema = z.object({
  feedbackRating: z.number().int().min(1).max(5),
});

export type AIRecommendationPayload = z.infer<typeof aiRecommendationSchema>;
export type FeedbackDto = z.infer<typeof feedbackSchema>;
