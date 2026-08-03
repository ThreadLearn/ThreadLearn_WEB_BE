import { Inject, Injectable } from '@nestjs/common';
import { IUserRepository, USER_REPOSITORY } from '../../../auth/domain/interfaces/user.repository';
import {
  InstructorManagementResult,
  LockInstructorInput,
} from '../dto/instructor-management-use-case.dto';
import { AdminUserPresenter } from '../presenters/admin-user.presenter';
import { assertActiveAdmin } from './admin-access.helper';
import { assertManageableInstructor } from './instructor-access.helper';

@Injectable()
export class LockInstructorService {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository) {}

  async execute(input: LockInstructorInput): Promise<InstructorManagementResult> {
    assertActiveAdmin(await this.userRepo.findById(input.adminId));
    const instructor = await this.userRepo.findById(input.instructorId);
    assertManageableInstructor(instructor);
    instructor.lockByAdmin(input.lockedReason, new Date());
    return {
      user: AdminUserPresenter.toSafeUser(
        await this.userRepo.updateStudentManagementState(instructor)
      ),
    };
  }
}
