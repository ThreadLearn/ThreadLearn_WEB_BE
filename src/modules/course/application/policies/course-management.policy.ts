import { Injectable } from '@nestjs/common';
import { ForbiddenError } from '../../../../common/custom-error';

export interface CourseManagementActor {
  id: string;
  role: string;
}

export interface CourseManagementCourseTarget {
  id: string;
  instructorId?: string | null;
  status?: string;
  isDeleted?: boolean;
  deletedAt?: Date | null;
}

/**
 * Normalizes ObjectId/string/null/undefined into a clean string for safe equality checks.
 */
export function normalizeId(id?: unknown): string | undefined {
  if (id === null || id === undefined) return undefined;
  if (typeof id === 'string') {
    const trimmed = id.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (typeof id === 'object' && 'toString' in id && typeof (id as any).toString === 'function') {
    const str = (id as any).toString();
    if (str && str !== '[object Object]') return str;
  }
  return undefined;
}

export function isSameId(a?: unknown, b?: unknown): boolean {
  const normA = normalizeId(a);
  const normB = normalizeId(b);
  return !!normA && !!normB && normA === normB;
}

/**
 * Centralized authorization policy for Course content management, structure management,
 * publishing, instructor assignment, and destructive actions.
 *
 * Distinct from:
 * 1. LearningAccessService (learning access / enrollment / public visibility)
 * 2. CourseInstructorAssignmentPolicy (validation of instructor role & account status)
 */
@Injectable()
export class CourseManagementPolicy {
  private getCourseTargetProps(course: CourseManagementCourseTarget): CourseManagementCourseTarget {
    if (typeof (course as any).toProps === 'function') {
      const props = (course as any).toProps();
      return {
        id: course.id || props.id,
        instructorId: props.instructorId,
        status: props.status,
        isDeleted: props.status === 'deleted' || Boolean(props.deletedAt),
        deletedAt: props.deletedAt,
      };
    }
    return course;
  }

  private isCourseDeleted(course: CourseManagementCourseTarget): boolean {
    const target = this.getCourseTargetProps(course);
    return Boolean(target.isDeleted || target.status === 'deleted' || target.deletedAt);
  }

  isAssignedInstructor(
    actor?: CourseManagementActor | null,
    course?: CourseManagementCourseTarget | null,
  ): boolean {
    if (!actor?.id || actor.role !== 'INSTRUCTOR' || !course) return false;
    const target = this.getCourseTargetProps(course);
    return isSameId(actor.id, target.instructorId);
  }

  canAuthorCourse(
    actor?: CourseManagementActor | null,
    course?: CourseManagementCourseTarget | null,
  ): boolean {
    if (!actor?.id || !course) return false;
    if (this.isCourseDeleted(course)) return false;

    if (actor.role === 'ADMIN') return true;
    if (actor.role === 'INSTRUCTOR') {
      const target = this.getCourseTargetProps(course);
      if (target.status !== undefined && target.status !== 'draft') return false;
      return this.isAssignedInstructor(actor, course);
    }

    return false;
  }

  assertCanAuthorCourse(
    actor?: CourseManagementActor | null,
    course?: CourseManagementCourseTarget | null,
  ): void {
    if (!this.canAuthorCourse(actor, course)) {
      throw new ForbiddenError('You do not have permission to author content for this course.');
    }
  }

  canManageCourseStructure(
    actor?: CourseManagementActor | null,
    course?: CourseManagementCourseTarget | null,
  ): boolean {
    return this.canAuthorCourse(actor, course);
  }

  assertCanManageCourseStructure(
    actor?: CourseManagementActor | null,
    course?: CourseManagementCourseTarget | null,
  ): void {
    if (!this.canManageCourseStructure(actor, course)) {
      throw new ForbiddenError('You do not have permission to manage the structure of this course.');
    }
  }

  canPublishCourse(
    actor?: CourseManagementActor | null,
    course?: CourseManagementCourseTarget | null,
  ): boolean {
    if (!actor?.id || !course) return false;
    if (this.isCourseDeleted(course)) return false;

    return actor.role === 'ADMIN';
  }

  assertCanPublishCourse(
    actor?: CourseManagementActor | null,
    course?: CourseManagementCourseTarget | null,
  ): void {
    if (!this.canPublishCourse(actor, course)) {
      throw new ForbiddenError('Only administrators are allowed to publish or unpublish courses.');
    }
  }

  canAssignInstructor(actor?: CourseManagementActor | null): boolean {
    return actor?.role === 'ADMIN';
  }

  assertCanAssignInstructor(actor?: CourseManagementActor | null): void {
    if (!this.canAssignInstructor(actor)) {
      throw new ForbiddenError('Only administrators are allowed to assign or unassign course instructors.');
    }
  }

  canDeleteCourse(
    actor?: CourseManagementActor | null,
    course?: CourseManagementCourseTarget | null,
  ): boolean {
    if (!actor?.id || !course) return false;
    if (this.isCourseDeleted(course)) return false;

    return actor.role === 'ADMIN';
  }

  assertCanDeleteCourse(
    actor?: CourseManagementActor | null,
    course?: CourseManagementCourseTarget | null,
  ): void {
    if (!this.canDeleteCourse(actor, course)) {
      throw new ForbiddenError('Only administrators are allowed to delete courses.');
    }
  }

  canRestoreCourse(
    actor?: CourseManagementActor | null,
    course?: CourseManagementCourseTarget | null,
  ): boolean {
    if (!actor?.id || !course) return false;
    if (!this.isCourseDeleted(course)) return false;

    return actor.role === 'ADMIN';
  }

  assertCanRestoreCourse(
    actor?: CourseManagementActor | null,
    course?: CourseManagementCourseTarget | null,
  ): void {
    if (!this.canRestoreCourse(actor, course)) {
      throw new ForbiddenError('Only administrators are allowed to restore deleted courses.');
    }
  }

  canReadCourseForManagement(
    actor?: CourseManagementActor | null,
    course?: CourseManagementCourseTarget | null,
  ): boolean {
    if (!actor?.id || !course) return false;
    if (actor.role === 'ADMIN') return true;
    if (actor.role === 'INSTRUCTOR') {
      if (this.isCourseDeleted(course)) return false;
      return this.isAssignedInstructor(actor, course);
    }

    return false;
  }

  assertCanReadCourseForManagement(
    actor?: CourseManagementActor | null,
    course?: CourseManagementCourseTarget | null,
  ): void {
    if (!this.canReadCourseForManagement(actor, course)) {
      throw new ForbiddenError('You do not have permission to view this course in the management workspace.');
    }
  }
}
