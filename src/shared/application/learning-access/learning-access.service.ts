import { Inject, Injectable } from '@nestjs/common';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../common/custom-error';
import {
  ILearningAccessData,
  LEARNING_ACCESS_DATA,
  LessonAccessSnapshot,
} from '../../domain/interfaces/learning-access-data.port';
import {
  AssertLearningAccessOptions,
  ILearningAccess,
  LearningAccessResult,
  LearningAccessViewer,
} from '../../domain/interfaces/learning-access.port';

const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

const isObjectId = (value: string) => OBJECT_ID_PATTERN.test(value);

@Injectable()
export class LearningAccessService implements ILearningAccess {
  constructor(@Inject(LEARNING_ACCESS_DATA) private readonly data: ILearningAccessData) {}

  async checkLessonAccess(
    lessonId: string,
    viewer?: LearningAccessViewer,
  ): Promise<LearningAccessResult> {
    if (!isObjectId(lessonId)) throw new BadRequestError('Invalid lesson id.');
    const lesson = await this.data.findLesson(lessonId);
    if (!lesson) {
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

    const course = await this.data.findCourse(lesson.courseId);
    if (!course) {
      return { canView: false, reason: 'LESSON_NOT_FOUND' };
    }
    if (course.status !== 'published') {
      return { canView: false, reason: 'NOT_ENROLLED' };
    }
    if (course.isPremium && !(await this.data.hasActivePremium(viewer.id))) {
      return { canView: false, reason: 'PREMIUM_REQUIRED' };
    }

    const enrolled = await this.data.isEnrolled(viewer.id, lesson.courseId);
    if (!enrolled) {
      return { canView: false, reason: 'NOT_ENROLLED' };
    }
    return { canView: true, reason: 'ENROLLED' };
  }

  async assertLessonAccess(
    lessonId: string,
    viewer: LearningAccessViewer,
    options: AssertLearningAccessOptions = {},
  ): Promise<LessonAccessSnapshot> {
    const access = await this.checkLessonAccess(lessonId, viewer);
    if (!access.canView || (!options.allowPreview && access.reason === 'PREVIEW')) {
      if (access.reason === 'LESSON_NOT_FOUND') throw new NotFoundError('Lesson not found.');
      if (access.reason === 'LESSON_LOCKED') throw new ForbiddenError('Lesson is locked.');
      throw new ForbiddenError('You must enroll before using this lesson feature.');
    }

    const lesson = await this.data.findLesson(lessonId);
    if (!lesson) throw new NotFoundError('Lesson not found.');
    return lesson;
  }

  async assertLessonViewAccess(
    lessonId: string,
    viewer: LearningAccessViewer,
  ): Promise<LessonAccessSnapshot> {
    return this.assertLessonAccess(lessonId, viewer, { allowPreview: true });
  }

  async assertLessonInteractionAccess(
    lessonId: string,
    viewer: LearningAccessViewer,
  ): Promise<LessonAccessSnapshot> {
    return this.assertLessonAccess(lessonId, viewer, { allowPreview: false });
  }

  async assertCourseInteractionAccess(
    courseId: string,
    viewer: LearningAccessViewer,
  ): Promise<void> {
    if (!isObjectId(courseId)) throw new NotFoundError('Course not found.');
    const course = await this.data.findCourse(courseId);
    if (!course) throw new NotFoundError('Course not found.');
    if (viewer.role === 'ADMIN') return;

    if (course.status !== 'published') {
      throw new ForbiddenError('Comments are disabled on this course.');
    }
    if (!viewer.id) {
      throw new ForbiddenError('You must enroll to comment on this course.');
    }
    if (course.isPremium && !(await this.data.hasActivePremium(viewer.id))) {
      throw new ForbiddenError('You need an active premium plan to comment on this course.');
    }

    const enrolled = await this.data.isEnrolled(viewer.id, courseId);
    if (!enrolled) throw new ForbiddenError('You must enroll to comment on this course.');
  }

  async touchLessonCursor(userId: string, courseId: string, lessonId: string): Promise<void> {
    await this.data.touchCursor(userId, courseId, lessonId);
  }
}
