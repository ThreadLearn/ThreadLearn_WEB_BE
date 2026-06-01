import { z } from 'zod';

const questionSchema = z.object({
  questionText: z.string().min(1, 'Question text is required.'),
  options: z.array(z.string().min(1)).min(2, 'At least 2 options are required.'),
  correctAnswerIndex: z.number().int().min(0),
}).refine(
  (q) => q.correctAnswerIndex < q.options.length,
  { message: 'correctAnswerIndex must be less than options length' }
);

export const createQuizSchema = z.object({
  lessonId: z.string().min(1, 'Lesson ID is required.'),
  title: z.string().min(1, 'Title is required.').max(255),
  description: z.string().optional(),
  passingScorePercent: z.number().int().min(0).max(100).default(80),
  timeLimitSeconds: z.number().int().positive().optional(),
  xpReward: z.number().int().positive().default(100),
  questions: z.array(questionSchema).min(1, 'Quiz must have at least 1 question.'),
});

export type CreateQuizDto = z.infer<typeof createQuizSchema>;

export const quizSubmitSchema = z.object({
  quizId: z.string().min(1, 'Quiz ID is required.'),
  answers: z.record(z.coerce.number()),
});
