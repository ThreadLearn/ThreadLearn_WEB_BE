import { Injectable } from '@nestjs/common';
import { SubmitAttemptService } from './submit-attempt.service';
import { GetAttemptService } from './get-attempt.service';
import { GetMyAttemptsService } from './get-my-attempts.service';
import { QuizAttemptRepository } from '../../infrastructure/persistence/repositories/mongo-quiz-attempt.repository';
import { MongoQuizRepository } from '../../../quiz/infrastructure/persistence/mongo-quiz.repository';
import { DomainEventPublisher } from '../events/domain-event.publisher';

@Injectable()
export class QuizAttemptsService {
  private readonly submitAttemptService: SubmitAttemptService;
  private readonly getAttemptService: GetAttemptService;
  private readonly getMyAttemptsService: GetMyAttemptsService;

  constructor(
    submitAttemptService?: SubmitAttemptService,
    getAttemptService?: GetAttemptService,
    getMyAttemptsService?: GetMyAttemptsService,
  ) {
    const repo = new QuizAttemptRepository();
    const quizRepo = new MongoQuizRepository();
    const eventPublisher = new DomainEventPublisher();
    this.submitAttemptService = submitAttemptService || new SubmitAttemptService(repo, quizRepo, eventPublisher);
    this.getAttemptService = getAttemptService || new GetAttemptService(repo);
    this.getMyAttemptsService = getMyAttemptsService || new GetMyAttemptsService(repo);
  }

  async submitAttempt(
    userId: string,
    quizId: string,
    answers: Record<string, number>,
    startTime?: string,
  ) {
    return this.submitAttemptService.execute(userId, quizId, answers, startTime);
  }

  async getAttemptById(userId: string, attemptId: string) {
    return this.getAttemptService.execute(userId, attemptId);
  }

  async getMyAttempts(userId: string) {
    return this.getMyAttemptsService.execute(userId);
  }
}
export default QuizAttemptsService;
