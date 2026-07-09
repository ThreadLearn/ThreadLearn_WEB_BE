import { Inject, Injectable } from '@nestjs/common';
import { ForbiddenError, NotFoundError } from '../../../../common/custom-error';
import { UserEntity } from '../../../auth/domain/entities/user.entity';
import { IUserRepository, USER_REPOSITORY } from '../../../auth/domain/interfaces/user.repository';
import {
  IUserStatsReader,
  USER_STATS_READER,
} from '../../domain/interfaces/user-stats-reader.port';
import { GetMyProfileInput, GetMyProfileResult } from '../dto/profile-use-case.dto';
import { ProfileUserPresenter } from '../presenters/profile-user.presenter';

/** Fallback stats khi user chưa có bản ghi UserStats — mirror ĐÚNG legacy `getProfile`. */
const DEFAULT_PROFILE_STATS = { xp: 0, level: 1, currentStreak: 0, highestStreak: 0 } as const;

/**
 * UC09 — Get My Profile. Mirror `UsersService.getProfile(userId)`:
 * findById → reject nếu không có (`User profile not found.`) → chặn inactive/locked
 * → đọc stats qua reader → trả `{ user: sanitizeUser, stats: stats || fallback }`.
 *
 * KHÔNG tự tạo stats (legacy GET không tạo). KHÔNG query DB trực tiếp. KHÔNG import
 * model. Stats luôn non-null trong result (đã áp fallback) ⇒ giữ đúng shape legacy.
 * Phase DEV1.6C: đăng ký provider; CHƯA inject vào controller (controller còn legacy).
 */
@Injectable()
export class GetMyProfileService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(USER_STATS_READER) private readonly statsReader: IUserStatsReader,
  ) {}

  async execute(input: GetMyProfileInput): Promise<GetMyProfileResult> {
    const user = await this.userRepo.findById(input.userId);
    if (!user) {
      throw new NotFoundError('User profile not found.');
    }
    this.assertCanAuthenticate(user);

    const stats = await this.statsReader.getStatsByUserId(input.userId);

    return {
      user: ProfileUserPresenter.toSafeUser(user),
      stats: stats ?? { ...DEFAULT_PROFILE_STATS },
    };
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
