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
  | 'NEW_USER_REGISTERED'
  | 'STUDENT_COMMENT_REPORT'
  | 'COMMENT_REPLY'
  | 'AI_FEEDBACK'
  | 'SYSTEM_ERROR';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: NotificationType;
  metadata?: Record<string, unknown>;
  link?: string;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
}

const NotificationSchema: Schema<INotification> = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
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
        'NEW_USER_REGISTERED',
        'STUDENT_COMMENT_REPORT',
        'COMMENT_REPLY',
        'AI_FEEDBACK',
        'SYSTEM_ERROR',
      ],
      default: 'SYSTEM',
    },
    metadata: { type: Schema.Types.Mixed },
    link: { type: String, trim: true },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export const Notification: Model<INotification> =
  mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);
export default Notification;
