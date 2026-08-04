import { Inject, Injectable } from '@nestjs/common';
import { BadRequestError, NotFoundError } from '../../../../common/custom-error';
import { IUserRepository, USER_REPOSITORY } from '../../../auth/domain/interfaces/user.repository';

/**
 * Shared ownership rule for both Course creation and later Admin assignment.
 * Domain represents an unassigned Course as `undefined`; HTTP uses `null` only for explicit unassign.
 */
@Injectable()
export class CourseInstructorAssignmentPolicy {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository) {}

  async resolveInstructorId(instructorId?: string | null): Promise<string | undefined> {
    if (instructorId === undefined || instructorId === null) return undefined;

    const instructor = await this.userRepo.findById(instructorId);
    if (!instructor) throw new NotFoundError('Instructor not found.');

    const props = instructor.toProps();
    if (props.role !== 'INSTRUCTOR') {
      throw new BadRequestError('Assigned user must have the INSTRUCTOR role.');
    }
    // Admin lock is represented by both `isActive=false` and a `lockedAt` timestamp.
    if (!props.isActive || props.lockedAt) {
      throw new BadRequestError('Assigned instructor must have an active, unlocked account.');
    }

    return instructor.id;
  }
}
