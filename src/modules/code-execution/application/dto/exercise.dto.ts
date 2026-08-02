import { z } from '../../../../common/zod/z';

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id.');
const testCase = z.object({
  input: z.string().max(10000).default(''),
  expectedOutput: z.string().max(10000),
  isHidden: z.boolean().default(false),
  points: z.number().nonnegative().max(1000).default(1),
});

const assignmentFields = {
  title: z.string().trim().min(1).max(200),
  description: z.string().max(20000).optional(),
  starterCode: z.string().max(50000).optional(),
  language: z.enum(['javascript', 'python', 'java', 'cpp', 'c']),
  testCases: z.array(testCase).max(100).optional(),
  timeLimitMs: z.coerce.number().int().min(100).max(30000).optional(),
  memoryLimitKb: z.coerce.number().int().min(16384).max(524288).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'CLOSED']).optional(),
  deadline: z.coerce.date().nullable().optional(),
  maxSubmissions: z.coerce.number().int().positive().max(1000).nullable().optional(),
};

export const exerciseCreateSchema = z.object({ lessonId: objectId, ...assignmentFields });
export const exerciseUpdateSchema = z.object(assignmentFields).refine((value) => Object.keys(value).length > 0, 'At least one field is required.');
export const exerciseIdParamSchema = objectId;
export const exerciseListQuerySchema = z.object({ lessonId: objectId });
export const assignmentRunSchema = z.object({ sourceCode: z.string().min(1).max(50000), language: z.enum(['javascript', 'python', 'java', 'cpp', 'c']).optional() });
export const assignmentSubmitSchema = assignmentRunSchema.extend({ idempotencyKey: z.string().min(8).max(128).optional() });
export const submissionListQuerySchema = z.object({ page: z.coerce.number().int().positive().default(1), limit: z.coerce.number().int().positive().max(100).default(20) });

export type ExerciseUpsertPayload = z.infer<typeof exerciseCreateSchema>;
export type ExerciseUpdatePayload = z.infer<typeof exerciseUpdateSchema>;
export type AssignmentRunPayload = z.infer<typeof assignmentRunSchema>;
export type AssignmentSubmitPayload = z.infer<typeof assignmentSubmitSchema>;
export type SubmissionListQuery = z.infer<typeof submissionListQuerySchema>;
