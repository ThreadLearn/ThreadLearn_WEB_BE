import mongoose, { Schema, Document, Model } from 'mongoose';

export type NotificationType =
  // Student events
  | 'LESSON_COMPLETED'
  | 'QUIZ_PASSED'
  | 'QUIZ_FAILED'
  | 'COURSE_COMPLETED'
  | 'COURSE_ENROLLED'
  | 'LEVEL_UP'
  | 'BOOKMARK_COURSE_UPDATED'
  | 'PAYMENT_SUCCESS'
  // Admin events
  | 'NEW_USER_REGISTERED'
  | 'STUDENT_COMMENT_REPORT'
  | 'SYSTEM_ERROR'
  // Legacy types (backward compat)
  | 'SYSTEM'
  | 'ACHIEVEMENT'
  | 'LEADERBOARD'
  | 'ENROLLMENT';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: NotificationType;
  metadata?: Record<string, any>;
  isRead: boolean;
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
        'LESSON_COMPLETED', 'QUIZ_PASSED', 'QUIZ_FAILED', 'COURSE_COMPLETED',
        'COURSE_ENROLLED', 'LEVEL_UP', 'BOOKMARK_COURSE_UPDATED', 'PAYMENT_SUCCESS',
        'NEW_USER_REGISTERED', 'STUDENT_COMMENT_REPORT', 'SYSTEM_ERROR',
        'SYSTEM', 'ACHIEVEMENT', 'LEADERBOARD', 'ENROLLMENT',
      ],
      default: 'SYSTEM',
    },
    metadata: { type: Schema.Types.Mixed },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export const Notification: Model<INotification> =
  mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);
export default Notification;
export { NotificationSchema };

