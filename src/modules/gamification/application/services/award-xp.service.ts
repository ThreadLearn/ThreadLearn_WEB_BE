import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../common/custom-error';
import { IUserStatsRepository } from '../../domain/interfaces/user-stats.repository';

@Injectable()
export class AwardXpService {
  constructor(
    @Inject('IUserStatsRepository')
    private readonly userStatsRepository: IUserStatsRepository,
  ) {}

  async execute(userId: string, xpAmount: number) {
    const stats = await this.userStatsRepository.findByUserId(userId);
    if (!stats) {
      throw new NotFoundError('User stats profile not found.');
    }

    stats.xp += xpAmount;
    stats.level = Math.floor(stats.xp / 1000) + 1;
    stats.lastActiveDate = new Date();
    await this.userStatsRepository.save(stats);

    return stats;
  }
}
