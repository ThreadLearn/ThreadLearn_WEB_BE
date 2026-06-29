import { Inject, Injectable } from '@nestjs/common';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../../common/custom-error';
import { UserEntity } from '../../../auth/domain/entities/user.entity';
import { IUserRepository, USER_REPOSITORY } from '../../../auth/domain/interfaces/user.repository';
import { AVATAR_STORAGE, IAvatarStorage } from '../../domain/interfaces/avatar-storage.port';
import { UploadAvatarInput, UploadAvatarResult } from '../dto/profile-use-case.dto';
import { ProfileUserPresenter } from '../presenters/profile-user.presenter';

/**
 * UC09 — Upload Avatar. Mirror luồng legacy (UsersController.uploadAvatar +
 * UsersService.updateAvatar), GIỮ ĐÚNG thứ tự quan sát được:
 *   1. `!file` ⇒ `BadRequestError('No avatar file provided in FormData.')`.
 *   2. Lưu file qua `AVATAR_STORAGE.saveAvatar` (wrap `saveUploadedFile(file,'avatars')`)
 *      — TRƯỚC khi tra user, đúng như controller legacy (size check + ghi disk ở đây;
 *      mime KHÔNG validate; KHÔNG xoá avatar cũ).
 *   3. findById → reject nếu không có (`User not found.`).
 *   4. Chặn inactive/locked.
 *   5. `UserEntity.setAvatarUrl(url)` → lưu qua repo.
 *   6. Trả safe user phẳng (mirror `data: sanitizeUser`).
 *
 * KHÔNG validate mime. KHÔNG xoá avatar cũ. KHÔNG log file buffer. KHÔNG lộ absolute
 * path (adapter chỉ trả URL public). Phase DEV1.6C: provider; CHƯA inject controller.
 */
@Injectable()
export class UploadAvatarService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(AVATAR_STORAGE) private readonly avatarStorage: IAvatarStorage,
  ) {}

  async execute(input: UploadAvatarInput): Promise<UploadAvatarResult> {
    if (!input.file) {
      throw new BadRequestError('No avatar file provided in FormData.');
    }

    const stored = await this.avatarStorage.saveAvatar(input.file);

    const user = await this.userRepo.findById(input.userId);
    if (!user) {
      throw new NotFoundError('User not found.');
    }
    this.assertCanAuthenticate(user);

    user.setAvatarUrl(stored.url);
    const saved = await this.userRepo.update(user);
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
