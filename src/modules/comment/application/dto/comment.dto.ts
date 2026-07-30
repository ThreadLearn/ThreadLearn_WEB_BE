import { z } from '../../../../common/zod/z';

const objectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id format.');

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
});

const validateNoAnonymousCodeShare = (value: { isAnonymous?: boolean; codeShareId?: string }, context: z.RefinementCtx) => {
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

export type CreateCommentDto = z.infer<typeof createCommentSchema>;
export type ListCommentsQueryDto = z.infer<typeof listCommentsQuerySchema>;
export type UpdateCommentDto = z.infer<typeof updateCommentSchema>;
export type CreateReplyDto = z.infer<typeof createReplySchema>;
