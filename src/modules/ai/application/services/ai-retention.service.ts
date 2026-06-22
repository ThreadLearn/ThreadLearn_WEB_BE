import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { logger } from '../../../../configs/logger';
import { AI_HISTORY_REPOSITORY, IAIHistoryRepository } from '../../domain/interfaces/ai-history.repository';

const FREE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class AIRetentionService {
  constructor(@Inject(AI_HISTORY_REPOSITORY) private readonly histories: IAIHistoryRepository) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purgeFreeHistory() {
    try {
      const cutoff = new Date(Date.now() - FREE_RETENTION_MS);
      const deletedCount = await this.histories.purgeFreeHistory(cutoff);
      if (deletedCount > 0) {
        logger.info(`AI retention: purged ${deletedCount} Free-tier history rows older than 30 days.`);
      }
    } catch (err) {
      logger.error('AI retention job failed.', err as Error);
    }
  }
}
