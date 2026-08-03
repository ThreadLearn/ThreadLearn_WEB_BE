import { BadRequestError, NotFoundError } from '../../../../common/custom-error';
import { UserEntity } from '../../../auth/domain/entities/user.entity';

export function assertManageableInstructor(
  instructor: UserEntity | null
): asserts instructor is UserEntity {
  if (!instructor) {
    throw new NotFoundError('Instructor not found.');
  }
  if (instructor.role !== 'INSTRUCTOR') {
    throw new BadRequestError('Target user is not an instructor.');
  }
}
