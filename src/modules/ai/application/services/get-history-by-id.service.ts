import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../common/custom-error';
import { AI_HISTORY_REPOSITORY, IAIHistoryRepository } from '../../domain/interfaces/ai-history.repository';

@Injectable()
export class GetHistoryByIdService {
  constructor(@Inject(AI_HISTORY_REPOSITORY) private readonly histories: IAIHistoryRepository) {}

  async execute(userId: string, id: string) {
    const history = await this.histories.findByUserAndId(userId, id);
    if (!history) throw new NotFoundError('AI_HISTORY_NOT_FOUND');
    return history;
  }
}
