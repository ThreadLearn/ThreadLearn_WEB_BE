import { Inject, Injectable } from '@nestjs/common';
import { AI_HISTORY_REPOSITORY, IAIHistoryRepository } from '../../domain/interfaces/ai-history.repository';

@Injectable()
export class GetHistoryLogsService {
  constructor(@Inject(AI_HISTORY_REPOSITORY) private readonly histories: IAIHistoryRepository) {}

  async execute(userId: string) {
    return this.histories.listByUser(userId);
  }
}
