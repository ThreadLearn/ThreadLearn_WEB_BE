import { Inject, Injectable } from '@nestjs/common';
import { IUserRepository, USER_REPOSITORY } from '../../../auth/domain/interfaces/user.repository';
import {
  GetInstructorListInput,
  GetInstructorListResult,
} from '../dto/instructor-management-use-case.dto';
import { AdminUserPresenter } from '../presenters/admin-user.presenter';
import { assertActiveAdmin } from './admin-access.helper';

@Injectable()
export class GetInstructorListService {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository) {}

  async execute(input: GetInstructorListInput): Promise<GetInstructorListResult> {
    const admin = await this.userRepo.findById(input.adminId);
    assertActiveAdmin(admin);
    const result = await this.userRepo.listInstructors(input);
    return {
      instructors: result.instructors.map((instructor) =>
        AdminUserPresenter.toSafeUser(instructor)
      ),
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    };
  }
}
