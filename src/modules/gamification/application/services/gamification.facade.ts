import { Injectable } from '@nestjs/common';
import { AwardXpService } from './award-xp.service';
import { UpdateStreakService } from './update-streak.service';
import { GetStatsService } from './get-stats.service';

@Injectable()
export class GamificationService {
  private static instance: GamificationService;

  constructor(
    private readonly awardXpService: AwardXpService,
    private readonly updateStreakService: UpdateStreakService,
    private readonly getStatsService: GetStatsService,
  ) {
    GamificationService.instance = this;
  }

  static async awardXP(userId: string, xpAmount: number) {
    return GamificationService.instance.awardXP(userId, xpAmount);
  }

  static async updateStreak(userId: string) {
    return GamificationService.instance.updateStreak(userId);
  }

  static async getStats(userId: string) {
    return GamificationService.instance.getStats(userId);
  }

  // Instance methods
  async awardXP(userId: string, xpAmount: number) {
    return this.awardXpService.execute(userId, xpAmount);
  }

  async updateStreak(userId: string) {
    return this.updateStreakService.execute(userId);
  }

  async getStats(userId: string) {
    return this.getStatsService.execute(userId);
  }
}
export default GamificationService;
