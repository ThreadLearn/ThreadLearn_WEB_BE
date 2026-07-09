import { Inject, Injectable } from '@nestjs/common';
import { IUserRepository, USER_REPOSITORY } from '../../../auth/domain/interfaces/user.repository';
import { LockStudentInput, LockStudentResult } from '../dto/student-management-use-case.dto';
import { AdminUserPresenter } from '../presenters/admin-user.presenter';
import { assertActiveAdmin, assertManageableStudent } from './admin-access.helper';

@Injectable()
export class LockStudentService {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository) {}

  async execute(input: LockStudentInput): Promise<LockStudentResult> {
    const admin = await this.userRepo.findById(input.adminId);
    assertActiveAdmin(admin);

    const student = await this.userRepo.findById(input.studentId);
    assertManageableStudent(student);

    student.lockByAdmin(input.lockedReason, new Date());
    const savedStudent = await this.userRepo.updateStudentManagementState(student);

    return { user: AdminUserPresenter.toSafeUser(savedStudent) };
  }
}
