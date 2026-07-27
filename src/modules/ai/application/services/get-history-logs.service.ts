import { Inject, Injectable } from '@nestjs/common';
import { AI_HISTORY_REPOSITORY, IAIHistoryRepository } from '../../domain/interfaces/ai-history.repository';
import { hasActiveSubscriptionFeature } from '../../../../shared/domain/subscription-features';

@Injectable()
export class GetHistoryLogsService {
  constructor(@Inject(AI_HISTORY_REPOSITORY) private readonly histories: IAIHistoryRepository) {}

  async execute(userId: string, page = 1, limit = 20) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const [user, result] = await Promise.all([
      this.histories.findUserProfile(userId),
      this.histories.listByUserPage(userId, safePage, safeLimit),
    ]);
    const canViewOptimizedCode = Boolean(user && (user.role === 'ADMIN' || hasActiveSubscriptionFeature({
      planType: user.planType,
      subscriptionExpiresAt: user.subscriptionExpiresAt,
      subscriptionFeatures: user.subscriptionFeatures,
      feature: 'AI_ADVANCED_ANALYSIS',
    })));
    const totalPages = Math.max(1, Math.ceil(result.total / safeLimit));
    return {
      items: result.items.map((history: any) => this.present(history, canViewOptimizedCode)),
      meta: { page: safePage, limit: safeLimit, total: result.total, totalPages, hasMore: safePage < totalPages },
    };
  }

  private present(history: any, canViewOptimizedCode: boolean) {
    const value = typeof history?.toObject === 'function' ? history.toObject() : { ...history };
    if (!canViewOptimizedCode) delete value.optimizedCode;
    return value;
  }
}
