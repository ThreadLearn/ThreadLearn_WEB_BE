import { Injectable } from '@nestjs/common';
import mongoose from 'mongoose';
import { User } from '../../../modules/auth/models/user.model';
import { Course } from '../../../modules/courses/models/course.model';
import { Enrollment } from '../../../modules/enrollments/models/enrollment.model';
import { Lesson } from '../../../modules/lessons/models/lesson.model';
import { hasActiveSubscriptionFeature } from '../../domain/subscription-features';
import {
  CourseAccessSnapshot,
  ILearningAccessData,
  LessonAccessSnapshot,
} from '../../domain/interfaces/learning-access-data.port';

@Injectable()
export class MongoLearningAccessDataAdapter implements ILearningAccessData {
  async findLesson(lessonId: string): Promise<LessonAccessSnapshot | null> {
    if (!mongoose.isValidObjectId(lessonId)) return null;
    const lesson = (await Lesson.findById(lessonId)
      .select('_id courseId status isPreview isLocked title')
      .lean()) as any;
    if (!lesson || lesson.status === 'deleted') return null;
    return {
      id: String(lesson._id),
      courseId: String(lesson.courseId),
      status: lesson.status,
      isPreview: !!lesson.isPreview,
      isLocked: !!lesson.isLocked,
      title: String(lesson.title ?? ''),
    };
  }

  async findCourse(courseId: string): Promise<CourseAccessSnapshot | null> {
    if (!mongoose.isValidObjectId(courseId)) return null;
    const course = (await Course.findById(courseId).select('_id status isPremium').lean()) as any;
    if (!course || course.status === 'deleted') return null;
    return {
      id: String(course._id),
      status: course.status,
      isPremium: !!course.isPremium,
    };
  }

  async isEnrolled(userId: string, courseId: string): Promise<boolean> {
    if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(courseId)) return false;
    const enrollment = await Enrollment.findOne({ userId, courseId }).select('_id').lean();
    return !!enrollment;
  }

  async hasActivePremium(userId: string): Promise<boolean> {
    if (!mongoose.isValidObjectId(userId)) return false;
    const user = (await User.findById(userId)
      .select('planType subscriptionExpiresAt subscriptionFeatures')
      .lean()) as any;
    return hasActiveSubscriptionFeature({
      planType: user?.planType,
      subscriptionExpiresAt: user?.subscriptionExpiresAt,
      subscriptionFeatures: user?.subscriptionFeatures,
      feature: 'PREMIUM_COURSES',
    });
  }

  async touchCursor(userId: string, courseId: string, lessonId: string): Promise<void> {
    if (
      !mongoose.isValidObjectId(userId) ||
      !mongoose.isValidObjectId(courseId) ||
      !mongoose.isValidObjectId(lessonId)
    ) {
      return;
    }
    await Enrollment.updateOne(
      { userId, courseId },
      { $set: { lastLessonId: lessonId, lastAccessedAt: new Date() } },
    );
  }
}
