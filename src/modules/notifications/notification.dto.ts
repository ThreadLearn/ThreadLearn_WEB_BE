import { z } from '../../common/zod/z';

export const notificationIdParamSchema = z.string().regex(
  /^[a-fA-F0-9]{24}$/,
  'Invalid notification id.',
);

export const notificationListQuerySchema = z.object({
  unread: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const adminNotificationListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  isRead: z.enum(['true', 'false']).optional(),
  type: z.enum([
    'SYSTEM', 'ACHIEVEMENT', 'LEADERBOARD', 'ENROLLMENT',
    'LESSON_COMPLETED', 'COURSE_COMPLETED', 'COURSE_ENROLLED',
    'QUIZ_PASSED', 'QUIZ_FAILED', 'LEVEL_UP', 'BOOKMARK_COURSE_UPDATED',
    'PAYMENT_SUCCESS', 'USER_REGISTERED', 'NEW_USER_REGISTERED',
    'STUDENT_COMMENT_REPORT', 'COMMENT_REPLY', 'DISCUSSION_REPLY', 'DISCUSSION_MENTION',
    'CODE_SOLUTION_SUBMITTED', 'CODE_SOLUTION_ACCEPTED', 'DISCUSSION_REOPENED', 'AI_FEEDBACK', 'SYSTEM_ERROR',
  ]).optional(),
});

export type NotificationListQuery = z.infer<typeof notificationListQuerySchema>;
export type AdminNotificationListQuery = z.infer<typeof adminNotificationListQuerySchema>;
