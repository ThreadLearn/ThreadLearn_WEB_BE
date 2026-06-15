// src/modules/lesson/schemas/lesson.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type LessonDocument = HydratedDocument<Lesson>;

@Schema({ timestamps: true })   // tự sinh createdAt, updatedAt
export class Lesson {
  @Prop({ type: Types.ObjectId, ref: 'Course', required: true, index: true })
  courseId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ required: true })
  content!: string;

  @Prop()
  attachmentUrl?: string;

  @Prop({ required: true, default: 0 })
  order!: number;
}

export const LessonSchema = SchemaFactory.createForClass(Lesson);

// ─── Compound index: courseId + order ──────────────────────────
// Tương đương LessonSchema.index({ courseId: 1, order: 1 }) ở bản thuần
LessonSchema.index({ courseId: 1, order: 1 });