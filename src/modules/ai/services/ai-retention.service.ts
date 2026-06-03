import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AIHistory } from '../models/ai-history.model';
import { User } from '../../auth/models/user.model';
import { logger } from '../../../configs/logger';

const FREE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

@Injectable()
export class AIRetentionService {
  /**
   * UC47 — Free students keep AI analysis history for 30 days only; Premium
   * keeps it forever. Run once per day in UTC to purge stale Free history.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purgeFreeHistory() {
    try {
      const cutoff = new Date(Date.now() - FREE_RETENTION_MS);
      const freeUsers = await User.find({
        $or: [{ planType: { $ne: 'PREMIUM' } }, { planType: { $exists: false } }],
      }).select('_id');
      const freeIds = freeUsers.map((u) => u._id);
      if (!freeIds.length) return;
      const result = await AIHistory.deleteMany({
        userId: { $in: freeIds },
        createdAt: { $lt: cutoff },
      });
      if (result.deletedCount > 0) {
        logger.info(`AI retention: purged ${result.deletedCount} Free-tier history rows older than 30 days.`);
      }
    } catch (err) {
      logger.error('AI retention job failed.', err as Error);
    }
  }
}
