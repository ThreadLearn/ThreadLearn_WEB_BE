import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type LessonType = 'article' | 'video' | 'coding' | 'quiz' | 'assignment' | 'mixed';
export type LessonStatus = 'active' | 'locked' | 'hidden' | 'deleted';

export interface ILesson extends Document {
  courseId: Types.ObjectId;
  sectionId?: Types.ObjectId;
  title: string;
  slug?: string;
  description?: string;
  contentMarkdown: string;
  lessonType: LessonType;
  videoUrl?: string;
  attachments: string[];
  codeSnippets: { language: string; code: string; description?: string }[];
  orderIndex: number;
  estimatedTime: number;
  isPreview: boolean;
  isLocked: boolean;
  status: LessonStatus;
  currentVersionId?: Types.ObjectId;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  // legacy compat with original schema
  /** @deprecated Use `contentMarkdown`; kept until FE migrates. */
  content?: string;
  /** @deprecated Use `attachments`; kept until FE migrates. */
  attachmentUrl?: string;
  /** @deprecated Use `orderIndex`; kept until FE migrates. */
  order?: number;
}

const LessonSchema: Schema<ILesson> = new Schema(
  {
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    sectionId: { type: Schema.Types.ObjectId, ref: 'Section', default: null, index: true },
    title: { type: String, required: true, trim: true },
    slug: { type: String, trim: true, lowercase: true },
    description: { type: String, trim: true },
    contentMarkdown: { type: String, default: '' },
    lessonType: {
      type: String,
      enum: ['article', 'video', 'coding', 'quiz', 'assignment', 'mixed'],
      default: 'article',
    },
    videoUrl: { type: String },
    attachments: { type: [String], default: [] },
    codeSnippets: {
      type: [
        {
          _id: false,
          language: { type: String, required: true },
          code: { type: String, required: true },
          description: { type: String },
        },
      ],
      default: [],
    },
    orderIndex: { type: Number, required: true, default: 0 },
    estimatedTime: { type: Number, default: 0, min: 0 },
    isPreview: { type: Boolean, default: false, index: true },
    isLocked: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['active', 'locked', 'hidden', 'deleted'],
      default: 'active',
      index: true,
    },
    currentVersionId: { type: Schema.Types.ObjectId, ref: 'LessonVersion' },
    deletedAt: { type: Date },

    // legacy fields kept so old data still loads
    content: { type: String },
    attachmentUrl: { type: String },
    order: { type: Number },
  },
  { timestamps: true }
);

LessonSchema.index({ courseId: 1, orderIndex: 1 });
LessonSchema.index({ courseId: 1, sectionId: 1, orderIndex: 1 });

export const Lesson: Model<ILesson> =
  mongoose.models.Lesson || mongoose.model<ILesson>('Lesson', LessonSchema);
export default Lesson;
