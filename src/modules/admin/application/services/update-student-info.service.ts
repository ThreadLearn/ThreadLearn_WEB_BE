import { Inject, Injectable } from '@nestjs/common';
import { IUserRepository, USER_REPOSITORY } from '../../../auth/domain/interfaces/user.repository';
import {
  UpdateStudentInfoInput,
  UpdateStudentInfoResult,
} from '../dto/student-management-use-case.dto';
import { AdminUserPresenter } from '../presenters/admin-user.presenter';
import { assertActiveAdmin, assertManageableStudent } from './admin-access.helper';

@Injectable()
export class UpdateStudentInfoService {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository) {}

  async execute(input: UpdateStudentInfoInput): Promise<UpdateStudentInfoResult> {
    const admin = await this.userRepo.findById(input.adminId);
    assertActiveAdmin(admin);

    const student = await this.userRepo.findById(input.studentId);
    assertManageableStudent(student);

    student.updateStudentInfo(
      {
        firstName: input.firstName,
        lastName: input.lastName,
        avatarUrl: input.avatarUrl,
        isVerified: input.isVerified,
      },
      new Date(),
    );
    const savedStudent = await this.userRepo.updateStudentManagementState(student);

    return { user: AdminUserPresenter.toSafeUser(savedStudent) };
  }
}
