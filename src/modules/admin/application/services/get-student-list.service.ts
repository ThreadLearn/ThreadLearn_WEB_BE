import { Inject, Injectable } from '@nestjs/common';
import { IUserRepository, USER_REPOSITORY } from '../../../auth/domain/interfaces/user.repository';
import { GetStudentListInput, GetStudentListResult } from '../dto/student-management-use-case.dto';
import { AdminUserPresenter } from '../presenters/admin-user.presenter';
import { assertActiveAdmin } from './admin-access.helper';

@Injectable()
export class GetStudentListService {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository) {}

  async execute(input: GetStudentListInput): Promise<GetStudentListResult> {
    const admin = await this.userRepo.findById(input.adminId);
    assertActiveAdmin(admin);

    const result = await this.userRepo.listStudents({
      page: input.page,
      limit: input.limit,
      search: input.search,
      isActive: input.isActive,
      isVerified: input.isVerified,
    });

    return {
      students: result.students.map((student) => AdminUserPresenter.toSafeUser(student)),
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    };
  }
}
