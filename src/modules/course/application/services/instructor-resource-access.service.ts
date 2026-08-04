import { Injectable } from '@nestjs/common';
import { ForbiddenError, NotFoundError } from '../../../../common/custom-error';
import { Course } from '../../../courses/models/course.model';
import { Lesson } from '../../../lessons/models/lesson.model';
import { Quiz } from '../../../quiz/infrastructure/persistence/schemas/quiz.schema';

export type ManagedResourceActor = { id: string; role: string };

/**
 * Resolves authoring permission from the assigned Course, never from a nested
 * resource's `createdBy` field.  This makes reassignment immediately revoke
 * the previous instructor's access to lessons, quizzes and assignments.
 */
@Injectable()
export class InstructorResourceAccessService {
  async assertCanReadCourse(actor: ManagedResourceActor, courseId: string) {
    const course = await Course.findById(courseId).select('_id instructorId status deletedAt').lean();
    if (!course || course.status === 'deleted' || course.deletedAt) {
      throw new NotFoundError('Course not found.');
    }
    if (actor.role === 'ADMIN') return course;
    if (actor.role === 'INSTRUCTOR' && course.instructorId && String(course.instructorId) === actor.id) {
      return course;
    }
    throw new ForbiddenError('You do not have permission to manage this course.');
  }

  async assertCanMutateCourse(actor: ManagedResourceActor, courseId: string) {
    const course = await this.assertCanReadCourse(actor, courseId);
    if (actor.role === 'ADMIN') return course;
    if (course.status !== 'draft' && course.status !== 'hidden') {
      throw new ForbiddenError('Course content can only be edited while the course is draft or hidden.');
    }
    return course;
  }

  async assertCanReadLessonResource(actor: ManagedResourceActor, lessonId: string) {
    const lesson = await Lesson.findById(lessonId).select('_id courseId status deletedAt').lean();
    if (!lesson || lesson.status === 'deleted' || lesson.deletedAt) {
      throw new NotFoundError('Lesson not found.');
    }
    await this.assertCanReadCourse(actor, String(lesson.courseId));
    return lesson;
  }

  async assertCanMutateLessonResource(actor: ManagedResourceActor, lessonId: string) {
    const lesson = await this.assertCanReadLessonResource(actor, lessonId);
    await this.assertCanMutateCourse(actor, String(lesson.courseId));
    return lesson;
  }

  async assertCanReadQuiz(actor: ManagedResourceActor, quizId: string) {
    const quiz = await Quiz.findOne({ _id: quizId, isDeleted: { $ne: true } }).select('_id lessonId').lean();
    if (!quiz) throw new NotFoundError('Quiz not found.');
    await this.assertCanReadLessonResource(actor, String(quiz.lessonId));
    return quiz;
  }

  async assertCanMutateQuiz(actor: ManagedResourceActor, quizId: string) {
    const quiz = await this.assertCanReadQuiz(actor, quizId);
    await this.assertCanMutateLessonResource(actor, String(quiz.lessonId));
    return quiz;
  }

  async listManagedCourseIds(actor: ManagedResourceActor): Promise<string[]> {
    if (actor.role === 'ADMIN') return [];
    if (actor.role !== 'INSTRUCTOR') return [];
    const courses = await Course.find({ instructorId: actor.id, status: { $ne: 'deleted' }, deletedAt: { $in: [null, undefined] } })
      .select('_id')
      .lean();
    return courses.map((course) => String(course._id));
  }

  async listManagedLessonIds(actor: ManagedResourceActor): Promise<string[]> {
    const courseIds = await this.listManagedCourseIds(actor);
    if (!courseIds.length) return [];
    const lessons = await Lesson.find({ courseId: { $in: courseIds }, status: { $ne: 'deleted' }, deletedAt: { $in: [null, undefined] } })
      .select('_id')
      .lean();
    return lessons.map((lesson) => String(lesson._id));
  }
}
