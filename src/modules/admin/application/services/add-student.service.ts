import { randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { BadRequestError } from '../../../../common/custom-error';
import { UserEntity } from '../../../auth/domain/entities/user.entity';
import { IPasswordHasher, PASSWORD_HASHER } from '../../../auth/domain/interfaces/password-hasher.port';
import { USER_STATS_PROVISIONER } from '../../../auth/domain/interfaces/user-stats-provisioner.port';
import { IUserRepository, USER_REPOSITORY } from '../../../auth/domain/interfaces/user.repository';
import { IInvitationEmail, INVITATION_EMAIL } from '../../domain/interfaces/invitation-email.port';
import { AddStudentInput, AddStudentResult } from '../dto/student-management-use-case.dto';
import { AdminUserPresenter } from '../presenters/admin-user.presenter';
import { assertActiveAdmin } from './admin-access.helper';

type StatsProvisioner = {
  ensureForUser(userId: string): Promise<void>;
};

@Injectable()
export class AddStudentService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: IPasswordHasher,
    @Inject(USER_STATS_PROVISIONER) private readonly statsProvisioner: StatsProvisioner,
    @Inject(INVITATION_EMAIL) private readonly invitationEmail: IInvitationEmail,
  ) {}

  async execute(input: AddStudentInput): Promise<AddStudentResult> {
    const admin = await this.userRepo.findById(input.adminId);
    assertActiveAdmin(admin);

    const existing = await this.userRepo.findByEmail(input.email);
    if (existing) {
      throw new BadRequestError('Email address is already in use.');
    }

    let generatedPassword: string | undefined;
    const password = input.password ?? (generatedPassword = randomBytes(12).toString('base64url'));
    const passwordHash = await this.passwordHasher.hash(password);
    const student = UserEntity.createVerifiedStudent({
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      now: new Date(),
    });

    const savedStudent = await this.userRepo.create(student);
    await this.statsProvisioner.ensureForUser(savedStudent.id);

    if (generatedPassword) {
      void this.invitationEmail
        .sendStudentInvitation({
          email: savedStudent.email,
          firstName: savedStudent.toProps().firstName ?? '',
          lastName: savedStudent.toProps().lastName ?? '',
          temporaryPassword: generatedPassword,
        })
        .catch(() => undefined);
    }

    return {
      user: AdminUserPresenter.toSafeUser(savedStudent),
      temporaryPasswordSent: !!generatedPassword,
    };
  }
}
