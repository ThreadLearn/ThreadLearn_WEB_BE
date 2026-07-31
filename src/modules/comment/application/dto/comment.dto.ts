import { z } from '../../../../common/zod/z';

const objectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id format.');
const learningContextSchema = z.object({
  expectedResult: z.string().min(1).max(1000),
  actualResult: z.string().min(1).max(1000),
  tried: z.string().min(1).max(1000),
});

export const commentIdParamSchema = objectIdSchema;

export const listCommentsQuerySchema = z.object({
  targetType: z.enum(['COURSE', 'LESSON']),
  targetId: objectIdSchema,
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  postType: z.enum(['GENERAL', 'QUESTION', 'CODE_HELP', 'CODE_REVIEW', 'EXPLANATION_REQUEST']).optional(),
  questionStatus: z.enum(['OPEN', 'SOLVED', 'CLOSED']).optional(),
});

const createCommentBaseSchema = z.object({
  targetType: z.enum(['COURSE', 'LESSON']),
  targetId: objectIdSchema,
  content: z.string().min(1).max(2000),
  parentId: objectIdSchema.optional(),
  isAnonymous: z.boolean().optional().default(false),
  mentionUserIds: z.array(objectIdSchema).optional(),
  postType: z.enum(['GENERAL', 'QUESTION', 'CODE_HELP', 'CODE_REVIEW', 'EXPLANATION_REQUEST']).optional(),
  codeShareId: objectIdSchema.optional(),
  learningContext: learningContextSchema.optional(),
});

const validateNoAnonymousCodeShare = (value: { isAnonymous?: boolean; codeShareId?: string; postType?: string; learningContext?: unknown }, context: z.RefinementCtx) => {
  if (value.isAnonymous && value.codeShareId) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['isAnonymous'], message: 'Code shares cannot be posted anonymously.' });
  }
};

export const createCommentSchema = createCommentBaseSchema.superRefine(validateNoAnonymousCodeShare);
export const createLessonCommentSchema = createCommentBaseSchema
  .omit({ targetType: true, targetId: true })
  .superRefine(validateNoAnonymousCodeShare);

export const createReplySchema = z.object({
  content: z.string().min(1).max(2000),
  isAnonymous: z.boolean().optional().default(false),
  postType: z.enum(['TEXT_REPLY', 'CODE_SOLUTION']).optional().default('TEXT_REPLY'),
  codeShareId: objectIdSchema.optional(),
}).superRefine((value, context) => {
  if (value.postType === 'CODE_SOLUTION' && !value.codeShareId) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['codeShareId'], message: 'A code solution requires a verified code share.' });
  }
  if (value.postType === 'TEXT_REPLY' && value.codeShareId) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['codeShareId'], message: 'Attach code as a code solution.' });
  }
  if (value.isAnonymous && value.codeShareId) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['isAnonymous'], message: 'Code shares cannot be posted anonymously.' });
  }
});

export const updateCommentSchema = z.object({
  content: z.string().min(1).max(2000),
});

export const reportDiscussionSchema = z.object({
  reason: z.enum(['SPAM', 'ABUSE', 'INCORRECT', 'SPOILER', 'UNSAFE_CODE', 'OTHER']),
  details: z.string().max(1000).optional(),
});

export const moderationSchema = z.object({
  action: z.enum(['HIDE', 'RESTORE']),
  reason: z.string().min(3).max(500),
});

export type CreateCommentDto = z.infer<typeof createCommentSchema>;
export type ListCommentsQueryDto = z.infer<typeof listCommentsQuerySchema>;
export type UpdateCommentDto = z.infer<typeof updateCommentSchema>;
export type CreateReplyDto = z.infer<typeof createReplySchema>;
