import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../common/custom-error';
import { AI_HISTORY_REPOSITORY, IAIHistoryRepository } from '../../domain/interfaces/ai-history.repository';

@Injectable()
export class UpdateFeedbackService {
  constructor(@Inject(AI_HISTORY_REPOSITORY) private readonly histories: IAIHistoryRepository) {}

  async execute(userId: string, id: string, feedbackRating: number) {
    const updated = await this.histories.updateFeedback(userId, id, feedbackRating);
    if (!updated) throw new NotFoundError('AI history not found.');
    return updated;
  }
}
