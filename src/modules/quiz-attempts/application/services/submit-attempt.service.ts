import { Inject, Injectable } from '@nestjs/common';
import { Quiz } from '../../../quiz/models/quiz.model';
import { QuizService } from '../../../quiz/application/services/quiz.facade';
import { QuizGradingService } from '../../domain/services/quiz-grading.service';
import { DomainEventPublisher } from '../../domain/events/domain-event.publisher';
import { QuizAttemptSubmittedEvent } from '../../domain/events/quiz-attempt-submitted.event';
import { QuizPassedEvent } from '../../domain/events/quiz-passed.event';
import { IQuizAttemptRepository } from '../../domain/interfaces/quiz-attempt.repository';
import { IQuizAttempt } from '../../models/quiz-attempt.model';

/**
 * UC40: Take Quiz (Student)
 * UC41: Grade Quiz (System)
 * Service to orchestrate quiz attempt submissions, delegating grading and emitting domain events.
 */
@Injectable()
export class SubmitAttemptService {
  private readonly quizGradingService: QuizGradingService;
  private readonly eventPublisher: DomainEventPublisher;

  constructor(
    @Inject('IQuizAttemptRepository')
    private readonly quizAttemptRepository: IQuizAttemptRepository,
    private readonly quizService?: QuizService,
    quizGradingService?: QuizGradingService,
    eventPublisher?: DomainEventPublisher,
  ) {
    this.quizGradingService = quizGradingService || new QuizGradingService();
    this.eventPublisher = eventPublisher || new DomainEventPublisher();
  }

  async execute(
    userId: string,
    quizId: string,
    answers: Record<string, number>,
    startTime?: string,
  ) {
    // Load quiz from service or fallback to direct model (for unit test compatibility)
    const quiz = this.quizService
      ? await this.quizService.getQuizById(quizId)
      : await Quiz.findById(quizId);

    if (!quiz) {
      throw new Error('Quiz not found.');
    }

    const passingThreshold = quiz.passingScorePercent ?? quiz.passingScore ?? 80;
    const limit = quiz.timeLimit ?? quiz.timeLimitSeconds ?? 1800;

    // UC41: Delegate grading business rules to Domain Service
    const grading = this.quizGradingService.grade(
      quiz.questions,
      answers,
      passingThreshold,
      startTime,
      limit,
    );

    // Save attempt using repository
    const attempt = await this.quizAttemptRepository.create({
      quizId: quizId as any,
      userId: userId as any,
      score: grading.score,
      answers,
      passed: grading.passed,
      startedAt: startTime ? new Date(startTime) : undefined,
    } as Partial<IQuizAttempt>);

    const attemptId = attempt._id?.toString() || '';

    // Emit submission event
    this.eventPublisher.publish(
      'quiz.submitted',
      new QuizAttemptSubmittedEvent(userId, quizId, attemptId, grading.score, grading.passed),
    );

    let xpRewarded = 0;
    if (grading.passed) {
      xpRewarded = quiz.xpReward;
      // Emit quiz passed event (event handlers will handle gamification and notification creation)
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
