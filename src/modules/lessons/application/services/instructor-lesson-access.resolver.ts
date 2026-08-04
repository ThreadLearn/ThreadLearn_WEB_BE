import { Injectable } from '@nestjs/common';
import mongoose from 'mongoose';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../../common/custom-error';
import { Course } from '../../../courses/models/course.model';
import { Section } from '../../../courses/models/section.model';
import { CourseManagementActor, CourseManagementPolicy } from '../../../course/application/policies/course-management.policy';
import { Lesson } from '../../models/lesson.model';

@Injectable()
export class InstructorLessonAccessResolver {
  private readonly policy = new CourseManagementPolicy();

  /**
   * Read authorization for listing lessons under a section.
   * Uses assertCanReadCourseForManagement so assigned instructors can view active lessons
   * in management workspace even if the parent course is published (read-only mode).
   */
  async assertCanListLessons(actor: CourseManagementActor, sectionId: string) {
    if (!mongoose.isValidObjectId(sectionId)) {
      throw new BadRequestError('Invalid section id.');
    }

    const section = await Section.findOne({ _id: sectionId, status: { $ne: 'deleted' } });
    if (!section) {
      throw new NotFoundError('Section not found.');
    }

    const course = await Course.findById(section.courseId);
    if (!course || course.status === 'deleted' || (course as any).isDeleted) {
      throw new NotFoundError('Course not found.');
    }

    this.policy.assertCanReadCourseForManagement(actor, {
      id: course._id.toString(),
      instructorId: course.instructorId ? String(course.instructorId) : undefined,
      status: course.status,
      isDeleted: (course as any).isDeleted ?? (course.status as string) === 'deleted',
    });

    return { section, course };
  }

  /**
   * Read authorization for getting detailed lesson content for editor preview/viewing.
   * Allows reading locked lessons or out-of-scope types (quiz/coding/assignment/mixed)
   * in read-only mode for the assigned instructor.
   */
  async assertCanReadLessonDetail(actor: CourseManagementActor, lessonId: string) {
    if (!mongoose.isValidObjectId(lessonId)) {
      throw new BadRequestError('Invalid lesson id.');
    }

    const lesson = await Lesson.findOne({ _id: lessonId, status: { $ne: 'deleted' } });
    if (!lesson) {
      throw new NotFoundError('Lesson not found.');
    }

    if (!lesson.sectionId) {
      throw new NotFoundError('Lesson has no valid section.');
    }

    const section = await Section.findOne({ _id: lesson.sectionId, status: { $ne: 'deleted' } });
    if (!section) {
      throw new NotFoundError('Section not found.');
    }

    const course = await Course.findById(section.courseId);
    if (!course || course.status === 'deleted' || (course as any).isDeleted) {
      throw new NotFoundError('Course not found.');
    }

    this.policy.assertCanReadCourseForManagement(actor, {
      id: course._id.toString(),
      instructorId: course.instructorId ? String(course.instructorId) : undefined,
      status: course.status,
      isDeleted: (course as any).isDeleted ?? (course.status as string) === 'deleted',
    });

    return { lesson, section, course };
  }

  /**
   * Mutation authorization for section-level operations (Create Lesson, Reorder Lessons).
   * Requires draft course status via assertCanManageCourseStructure.
   */
  async assertCanAuthorSection(actor: CourseManagementActor, sectionId: string) {
    if (!mongoose.isValidObjectId(sectionId)) {
      throw new BadRequestError('Invalid section id.');
    }

    const section = await Section.findOne({ _id: sectionId, status: { $ne: 'deleted' } });
    if (!section) {
      throw new NotFoundError('Section not found.');
    }

    const course = await Course.findById(section.courseId);
    if (!course || course.status === 'deleted' || (course as any).isDeleted) {
      throw new NotFoundError('Course not found.');
    }

    this.policy.assertCanManageCourseStructure(actor, {
      id: course._id.toString(),
      instructorId: course.instructorId ? String(course.instructorId) : undefined,
      status: course.status,
      isDeleted: (course as any).isDeleted ?? (course.status as string) === 'deleted',
    });

    return { section, course };
  }

  /**
   * Mutation authorization for lesson-level operations (Update, Soft-Delete, Attachment Upload).
   * Requires draft course status, unlocked lesson, and allowlisted lesson type (article or video).
   */
  async assertCanAuthorLesson(actor: CourseManagementActor, lessonId: string) {
    if (!mongoose.isValidObjectId(lessonId)) {
      throw new BadRequestError('Invalid lesson id.');
    }

    const lesson = await Lesson.findOne({ _id: lessonId, status: { $ne: 'deleted' } });
    if (!lesson) {
      throw new NotFoundError('Lesson not found.');
    }

    if (lesson.isLocked || lesson.status === 'locked') {
      throw new ForbiddenError('Locked lessons cannot be modified by instructors.');
    }

    if (['quiz', 'coding', 'assignment', 'mixed'].includes(lesson.lessonType)) {
      throw new ForbiddenError(
        `Out-of-scope lesson types (${lesson.lessonType}) are read-only for instructors.`,
      );
    }

    if (!lesson.sectionId) {
      throw new NotFoundError('Lesson has no valid section.');
    }

    const section = await Section.findOne({ _id: lesson.sectionId, status: { $ne: 'deleted' } });
    if (!section) {
      throw new NotFoundError('Section not found.');
    }

    const course = await Course.findById(section.courseId);
    if (!course || course.status === 'deleted' || (course as any).isDeleted) {
      throw new NotFoundError('Course not found.');
    }

    this.policy.assertCanManageCourseStructure(actor, {
      id: course._id.toString(),
      instructorId: course.instructorId ? String(course.instructorId) : undefined,
      status: course.status,
      isDeleted: (course as any).isDeleted ?? (course.status as string) === 'deleted',
    });

    return { lesson, section, course };
  }
}
