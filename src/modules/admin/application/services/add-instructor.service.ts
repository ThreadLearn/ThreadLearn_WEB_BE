import { randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { BadRequestError } from '../../../../common/custom-error';
import { ForgotPasswordService } from '../../../auth/application/services/forgot-password.service';
import { UserEntity } from '../../../auth/domain/entities/user.entity';
import {
  IPasswordHasher,
  PASSWORD_HASHER,
} from '../../../auth/domain/interfaces/password-hasher.port';
import { USER_STATS_PROVISIONER } from '../../../auth/domain/interfaces/user-stats-provisioner.port';
import { IUserRepository, USER_REPOSITORY } from '../../../auth/domain/interfaces/user.repository';
import { AddInstructorInput, AddInstructorResult } from '../dto/instructor-management-use-case.dto';
import { AdminUserPresenter } from '../presenters/admin-user.presenter';
import { assertActiveAdmin } from './admin-access.helper';

type StatsProvisioner = { ensureForUser(userId: string): Promise<void> };

@Injectable()
export class AddInstructorService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: IPasswordHasher,
    @Inject(USER_STATS_PROVISIONER) private readonly statsProvisioner: StatsProvisioner,
    private readonly forgotPasswordService: ForgotPasswordService
  ) {}

  async execute(input: AddInstructorInput): Promise<AddInstructorResult> {
    const admin = await this.userRepo.findById(input.adminId);
    assertActiveAdmin(admin);

    if (await this.userRepo.findByEmail(input.email)) {
      throw new BadRequestError('Email address is already in use.');
    }

    // Bootstrap password is never disclosed; the instructor must set a password
    // through the existing one-time reset-password link.
    const passwordHash = await this.passwordHasher.hash(randomBytes(32).toString('base64url'));
    const instructor = UserEntity.createNew({
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      role: 'INSTRUCTOR',
    });
    instructor.markEmailVerified(new Date());

    const savedInstructor = await this.userRepo.create(instructor);
    await this.statsProvisioner.ensureForUser(savedInstructor.id);

    await this.forgotPasswordService.execute({ email: savedInstructor.email });

    return {
      user: AdminUserPresenter.toSafeUser(savedInstructor),
      passwordSetupEmailSent: true,
    };
  }
}
