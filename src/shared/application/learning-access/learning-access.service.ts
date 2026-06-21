import mongoose from 'mongoose';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../common/custom-error';
import { User } from '../../../modules/auth/models/user.model';
import { Course } from '../../../modules/courses/models/course.model';
import { Enrollment } from '../../../modules/enrollments/models/enrollment.model';
import { ILesson, Lesson } from '../../../modules/lessons/models/lesson.model';
import {
  AssertLearningAccessOptions,
  ILearningAccess,
  LearningAccessResult,
  LearningAccessViewer,
} from '../../domain/interfaces/learning-access.port';

export class LearningAccessService implements ILearningAccess {
  async checkLessonAccess(
    lessonId: string,
    viewer?: LearningAccessViewer,
  ): Promise<LearningAccessResult> {
    return LearningAccessService.checkLessonAccess(lessonId, viewer);
  }

  async assertLessonAccess(
    lessonId: string,
    viewer: LearningAccessViewer,
    options: AssertLearningAccessOptions = {},
  ): Promise<ILesson> {
    return LearningAccessService.assertLessonAccess(lessonId, viewer, options);
  }

  async assertLessonViewAccess(lessonId: string, viewer: LearningAccessViewer): Promise<ILesson> {
    return LearningAccessService.assertLessonViewAccess(lessonId, viewer);
  }

  async assertLessonInteractionAccess(lessonId: string, viewer: LearningAccessViewer): Promise<ILesson> {
    return LearningAccessService.assertLessonInteractionAccess(lessonId, viewer);
  }

  static async checkLessonAccess(
    lessonId: string,
    viewer?: LearningAccessViewer,
  ): Promise<LearningAccessResult> {
    if (!mongoose.isValidObjectId(lessonId)) throw new BadRequestError('Invalid lesson id.');
    const lesson = await Lesson.findById(lessonId);
    if (!lesson || lesson.status === 'deleted') {
      return { canView: false, reason: 'LESSON_NOT_FOUND' };
    }
    if (viewer?.role === 'ADMIN') return { canView: true, reason: 'ADMIN' };

    if (lesson.status === 'locked' || lesson.isLocked) {
      if (lesson.isPreview) return { canView: true, reason: 'PREVIEW' };
      return { canView: false, reason: 'LESSON_LOCKED' };
    }
    if (lesson.isPreview) return { canView: true, reason: 'PREVIEW' };

    if (!viewer?.id) {
      return { canView: false, reason: 'NOT_ENROLLED' };
    }

    const course = await Course.findById(lesson.courseId).select('status isPremium');
    if (!course || course.status === 'deleted') {
      return { canView: false, reason: 'LESSON_NOT_FOUND' };
    }
    if (course.status !== 'published') {
      return { canView: false, reason: 'NOT_ENROLLED' };
    }
    if (course.isPremium && !(await this.hasActivePremium(viewer.id))) {
      return { canView: false, reason: 'PREMIUM_REQUIRED' };
    }

    const enrolled = await Enrollment.findOne({
      userId: viewer.id,
      courseId: lesson.courseId,
    }).select('_id');
    if (!enrolled) {
      return { canView: false, reason: 'NOT_ENROLLED' };
    }
    return { canView: true, reason: 'ENROLLED' };
  }

  static async assertLessonAccess(
    lessonId: string,
    viewer: LearningAccessViewer,
    options: AssertLearningAccessOptions = {},
  ): Promise<ILesson> {
    const access = await LearningAccessService.checkLessonAccess(lessonId, viewer);
    if (!access.canView || (!options.allowPreview && access.reason === 'PREVIEW')) {
      if (access.reason === 'LESSON_NOT_FOUND') throw new NotFoundError('Lesson not found.');
      if (access.reason === 'LESSON_LOCKED') throw new ForbiddenError('Lesson is locked.');
      throw new ForbiddenError('You must enroll before using this lesson feature.');
    }

    const lesson = await Lesson.findById(lessonId);
    if (!lesson || lesson.status === 'deleted') throw new NotFoundError('Lesson not found.');
    return lesson;
  }

  static async assertLessonViewAccess(
    lessonId: string,
    viewer: LearningAccessViewer,
  ): Promise<ILesson> {
    return LearningAccessService.assertLessonAccess(lessonId, viewer, { allowPreview: true });
  }

  static async assertLessonInteractionAccess(
    lessonId: string,
    viewer: LearningAccessViewer,
  ): Promise<ILesson> {
    return LearningAccessService.assertLessonAccess(lessonId, viewer, { allowPreview: false });
  }

  static async hasActivePremium(userId: string): Promise<boolean> {
    const user = await User.findById(userId).select('planType subscriptionExpiresAt');
    return (
      user?.planType === 'PREMIUM' &&
      (!user.subscriptionExpiresAt || user.subscriptionExpiresAt.getTime() > Date.now())
    );
  }
}
