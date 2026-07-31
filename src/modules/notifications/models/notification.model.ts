import mongoose, { Schema, Document, Model } from 'mongoose';

export type NotificationType =
  | 'SYSTEM'
  | 'ACHIEVEMENT'
  | 'LEADERBOARD'
  | 'ENROLLMENT'
  | 'LESSON_COMPLETED'
  | 'COURSE_COMPLETED'
  | 'COURSE_ENROLLED'
  | 'QUIZ_PASSED'
  | 'QUIZ_FAILED'
  | 'LEVEL_UP'
  | 'BOOKMARK_COURSE_UPDATED'
  | 'PAYMENT_SUCCESS'
  | 'USER_REGISTERED'
  | 'NEW_USER_REGISTERED'
  | 'STUDENT_COMMENT_REPORT'
  | 'COMMENT_REPLY'
  | 'DISCUSSION_REPLY'
  | 'DISCUSSION_MENTION'
  | 'CODE_SOLUTION_SUBMITTED'
  | 'CODE_SOLUTION_ACCEPTED'
  | 'DISCUSSION_REOPENED'
  | 'DISCUSSION_MODERATED'
  | 'AI_FEEDBACK'
  | 'SYSTEM_ERROR';

export type NotificationRecipientRole = 'ADMIN';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  recipientRole?: NotificationRecipientRole;
  title: string;
  message: string;
  type: NotificationType;
  metadata?: Record<string, unknown>;
  eventKey?: string;
  link?: string;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
}

const NotificationSchema: Schema<INotification> = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    recipientRole: { type: String, enum: ['ADMIN'], index: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: [
        'SYSTEM',
        'ACHIEVEMENT',
        'LEADERBOARD',
        'ENROLLMENT',
        'LESSON_COMPLETED',
        'COURSE_COMPLETED',
        'COURSE_ENROLLED',
        'QUIZ_PASSED',
        'QUIZ_FAILED',
        'LEVEL_UP',
        'BOOKMARK_COURSE_UPDATED',
        'PAYMENT_SUCCESS',
        'USER_REGISTERED',
        'NEW_USER_REGISTERED',
        'STUDENT_COMMENT_REPORT',
        'COMMENT_REPLY',
        'DISCUSSION_REPLY',
        'DISCUSSION_MENTION',
        'CODE_SOLUTION_SUBMITTED',
        'CODE_SOLUTION_ACCEPTED',
        'DISCUSSION_REOPENED',
        'DISCUSSION_MODERATED',
        'AI_FEEDBACK',
        'SYSTEM_ERROR',
      ],
      default: 'SYSTEM',
    },
    metadata: { type: Schema.Types.Mixed },
    eventKey: { type: String, trim: true },
    link: { type: String, trim: true },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, recipientRole: 1, isRead: 1, createdAt: -1 });
// Each active admin receives their own read state; this pair also makes webhook retries safe.
NotificationSchema.index({ userId: 1, eventKey: 1 }, { unique: true, sparse: true });

export const Notification: Model<INotification> =
  mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);
export default Notification;
