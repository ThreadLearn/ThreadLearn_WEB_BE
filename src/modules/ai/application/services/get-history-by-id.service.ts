import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../common/custom-error';
import { AI_HISTORY_REPOSITORY, IAIHistoryRepository } from '../../domain/interfaces/ai-history.repository';
import { hasActiveSubscriptionFeature } from '../../../../shared/domain/subscription-features';

@Injectable()
export class GetHistoryByIdService {
  constructor(@Inject(AI_HISTORY_REPOSITORY) private readonly histories: IAIHistoryRepository) {}

  async execute(userId: string, id: string) {
    const history = await this.histories.findByUserAndId(userId, id);
    if (!history) throw new NotFoundError('AI_HISTORY_NOT_FOUND');
    const user = await this.histories.findUserProfile(userId);
    const canViewOptimizedCode = Boolean(user && (user.role === 'ADMIN' || hasActiveSubscriptionFeature({
      planType: user.planType,
      subscriptionExpiresAt: user.subscriptionExpiresAt,
      subscriptionFeatures: user.subscriptionFeatures,
      feature: 'AI_ADVANCED_ANALYSIS',
    })));
    const value: any = typeof (history as any).toObject === 'function' ? (history as any).toObject() : { ...(history as any) };
    if (!canViewOptimizedCode) delete value.optimizedCode;
    return value;
  }
}
