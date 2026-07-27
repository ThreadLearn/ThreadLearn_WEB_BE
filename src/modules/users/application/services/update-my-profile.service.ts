import { Inject, Injectable } from '@nestjs/common';
import { ForbiddenError, NotFoundError } from '../../../../common/custom-error';
import { UserEntity } from '../../../auth/domain/entities/user.entity';
import { IUserRepository, USER_REPOSITORY } from '../../../auth/domain/interfaces/user.repository';
import { UpdateMyProfileInput, UpdateMyProfileResult } from '../dto/profile-use-case.dto';
import { ProfileUserPresenter } from '../presenters/profile-user.presenter';

/**
 * UC09 — Update My Profile. Mirror `UsersService.updateProfile(userId, data)`:
 * findById → reject nếu không có (`User not found.`) → chặn inactive/locked →
 * cập nhật ĐÚNG whitelist `firstName`/`lastName` qua `UserEntity.updateProfile`
 * (undefined ⇒ giữ; trim idempotent với zod đã trim) →
 * lưu qua repo → trả safe user phẳng (mirror `data: sanitizeUser`).
 *
 * KHÔNG validate unique/email. KHÔNG cho update email/role/password/account state/avatar. KHÔNG đổi shape.
 * Phase DEV1.6C: đăng ký provider; CHƯA inject vào controller.
 */
@Injectable()
export class UpdateMyProfileService {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository) {}

  async execute(input: UpdateMyProfileInput): Promise<UpdateMyProfileResult> {
    const user = await this.userRepo.findById(input.userId);
    if (!user) {
      throw new NotFoundError('User not found.');
    }
    this.assertCanAuthenticate(user);

    user.updateProfile({
      firstName: input.firstName,
      lastName: input.lastName,
    });

    const saved = await this.userRepo.updateProfileNames(user);
    return ProfileUserPresenter.toSafeUser(saved);
  }

  /** Mirror `assertUserCanAuthenticate`: chặn inactive hoặc locked (admin lock). */
  private assertCanAuthenticate(user: UserEntity): void {
    const p = user.toProps();
    if (p.isActive === false) {
      throw new ForbiddenError('User account is inactive.');
    }
    if (p.lockedAt) {
      throw new ForbiddenError('User account is locked.');
    }
  }
}
