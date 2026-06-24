import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ISection extends Document {
  courseId: Types.ObjectId;
  title: string;
  orderIndex: number;
  description?: string;
  isPublished: boolean;
  status: 'active' | 'deleted';
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SectionSchema: Schema<ISection> = new Schema(
  {
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    title: { type: String, required: true, trim: true },
    orderIndex: { type: Number, required: true, default: 0 },
    description: { type: String, trim: true },
    isPublished: { type: Boolean, default: true },
    status: { type: String, enum: ['active', 'deleted'], default: 'active', index: true },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

SectionSchema.index({ courseId: 1, orderIndex: 1 });

export const Section: Model<ISection> =
  mongoose.models.Section || mongoose.model<ISection>('Section', SectionSchema);
export default Section;
