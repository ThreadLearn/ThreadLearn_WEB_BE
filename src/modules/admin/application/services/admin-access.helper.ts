import { BadRequestError, ForbiddenError, NotFoundError } from '../../../../common/custom-error';
import { UserEntity } from '../../../auth/domain/entities/user.entity';

export function assertActiveAdmin(admin: UserEntity | null): asserts admin is UserEntity {
  if (!admin) {
    throw new ForbiddenError('Admin account not found.');
  }

  const props = admin.toProps();
  if (props.role !== 'ADMIN') {
    throw new ForbiddenError('You do not have permission to manage students.');
  }
  if (props.isActive === false) {
    throw new ForbiddenError('User account is inactive.');
  }
  if (props.lockedAt) {
    throw new ForbiddenError('User account is locked.');
  }
}

export function assertManageableStudent(student: UserEntity | null): asserts student is UserEntity {
  if (!student) {
    throw new NotFoundError('Student not found.');
  }
  if (!student.canBeManagedAsStudent()) {
    throw new BadRequestError('Target user is not a student.');
  }
}
