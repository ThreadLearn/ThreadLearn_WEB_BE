import { Injectable } from '@nestjs/common';
import mongoose from 'mongoose';
import {
  ILessonReadPort,
  LessonCompletionSnapshot,
} from '../../domain/interfaces/lesson-read.port';
import { Lesson } from '../../models/lesson.model';

/** Adapter cho LESSON_READ_PORT — module ngoài (enrollment) đọc bài qua đây. */
@Injectable()
export class MongoLessonReadAdapter implements ILessonReadPort {
  async getForCompletion(lessonId: string): Promise<LessonCompletionSnapshot | null> {
    if (!mongoose.isValidObjectId(lessonId)) return null;
    const doc = (await Lesson.findById(lessonId)
      .select('_id courseId status isLocked title')
      .lean()) as any;
    if (!doc || doc.status === 'deleted') return null;
    return {
      id: String(doc._id),
      courseId: String(doc.courseId),
      status: doc.status,
      isLocked: !!doc.isLocked,
      title: String(doc.title ?? ''),
    };
  }

  async countCourseLessons(courseId: string): Promise<number> {
    if (!mongoose.isValidObjectId(courseId)) return 0;
    return Lesson.countDocuments({ courseId, status: { $nin: ['deleted', 'hidden'] } });
  }
}
