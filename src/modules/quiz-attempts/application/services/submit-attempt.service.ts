import { Inject, Injectable } from '@nestjs/common';
import { DomainError, ErrorCode } from '../../../../shared/errors/error-codes';
import { IQuizRepository, QUIZ_REPOSITORY } from '../../../quiz/domain/interfaces/quiz.repository';
import { IQuizAttemptRepository, QUIZ_ATTEMPT_REPOSITORY } from '../../domain/interfaces/quiz-attempt.repository';
import { QuizAttempt } from '../../domain/entities/quiz-attempt.entity';
import { QuizGradingService } from '../../domain/services/quiz-grading.service';
import { DomainEventPublisher } from '../events/domain-event.publisher';
import { QuizAttemptSubmittedEvent } from '../../domain/events/quiz-attempt-submitted.event';
import { QuizPassedEvent } from '../../domain/events/quiz-passed.event';

/**
 * UC40: Take Quiz (Student)
 * UC41: Grade Quiz (System)
 */
@Injectable()
export class SubmitAttemptService {
  private readonly quizGradingService = new QuizGradingService();

  constructor(
    @Inject(QUIZ_ATTEMPT_REPOSITORY)
    private readonly quizAttemptRepository: IQuizAttemptRepository,
    @Inject(QUIZ_REPOSITORY)
    private readonly quizRepository: IQuizRepository,
    private readonly eventPublisher: DomainEventPublisher,
  ) {}

  async execute(
    userId: string,
    quizId: string,
    answers: Record<string, number>,
    startTime?: string,
  ) {
    const quiz = await this.quizRepository.findById(quizId);

    if (!quiz) {
      throw DomainError.notFound(ErrorCode.QUIZ_NOT_FOUND, 'Quiz not found.');
    }

    const passingThreshold = quiz.passingScorePercent;
    const limit = quiz.timeLimitSeconds;

    // UC41: Delegate grading business rules to Domain Service (Pure Computation)
    const grading = this.quizGradingService.grade(
      quiz.questions,
      answers,
      passingThreshold,
      startTime,
      limit,
    );

    // Domain factory validation
    const attemptEntity = QuizAttempt.createNew({
      quizId,
      userId,
      score: grading.score,
      answers,
      passed: grading.passed,
      startedAt: startTime ? new Date(startTime) : undefined,
    });

    // Save attempt using repository
    const attempt = await this.quizAttemptRepository.create(attemptEntity);
    const attemptId = attempt.id;

    let xpRewarded = 0;
    if (grading.passed) {
      xpRewarded = quiz.xpReward;
    }

    // ─────────────────────────────────────────────────────────────
    // NON-CRITICAL ASYNCHRONOUS EVENTS
    // ─────────────────────────────────────────────────────────────
    this.eventPublisher.publish(
      'quiz.submitted',
      new QuizAttemptSubmittedEvent(userId, quizId, attemptId, grading.score, grading.passed),
    );

    if (grading.passed) {
      this.eventPublisher.publish(
        'quiz.passed',
        new QuizPassedEvent(
          userId,
          quizId,
          quiz.title,
          attemptId,
          grading.score,
          xpRewarded,
        ),
      );
    }

    return {
      attempt,
      score: grading.score,
      passed: grading.passed,
      xpRewarded,
      passingScorePercent: passingThreshold,
      isTimeout: grading.isTimeout,
    };
  }
}
