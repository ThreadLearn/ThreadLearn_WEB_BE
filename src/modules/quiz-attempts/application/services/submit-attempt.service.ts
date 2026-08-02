import { Inject, Injectable } from '@nestjs/common';
import {
  EVENT_PUBLISHER,
  EventPublisher,
} from '../../../../shared/application/events/event-publisher.port';
import { DomainError, ErrorCode } from '../../../../shared/errors/error-codes';
import { IQuizRepository, QUIZ_REPOSITORY } from '../../../quiz/domain/interfaces/quiz.repository';
import { IQuizAttemptRepository, QUIZ_ATTEMPT_REPOSITORY } from '../../domain/interfaces/quiz-attempt.repository';
import {
  buildQuizReviewQuestions,
  QuizAttempt,
  QuizReviewSourceQuestion,
} from '../../domain/entities/quiz-attempt.entity';
import { QuizGradingService } from '../../domain/services/quiz-grading.service';
import { QuizAttemptSubmittedEvent } from '../../domain/events/quiz-attempt-submitted.event';
import { QuizPassedEvent } from '../../domain/events/quiz-passed.event';

/**
 * UC40: Take Quiz (Student)
 * UC41: Grade Quiz (System)
 */
@Injectable()
export class SubmitAttemptService {
  constructor(
    @Inject(QUIZ_ATTEMPT_REPOSITORY)
    private readonly quizAttemptRepository: IQuizAttemptRepository,
    @Inject(QUIZ_REPOSITORY)
    private readonly quizRepository: IQuizRepository,
    @Inject(EVENT_PUBLISHER)
    private readonly eventPublisher: EventPublisher,
    private readonly quizGradingService: QuizGradingService,
  ) { }

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

    return this.executeForQuestions(
      userId,
      quiz,
      answers,
      startTime,
      quiz.questions.map((question: any) => ({
        // Old quiz documents and the legacy regression fixtures do not carry
        // review-only option text. Grading only needs id + answer index, so
        // preserve backwards compatibility rather than crashing on submit.
        id: question.id ?? String(question._id),
        questionText: question.questionText ?? '',
        options: Array.isArray(question.options)
          ? question.options.map((text: string, index: number) => ({ optionId: `o${index + 1}`, text }))
          : [],
        correctAnswerIndex: question.correctAnswerIndex,
      })),
    );
  }

  /**
   * Chấm snapshot đã phát bởi QuizSession. Không đọc lại question bank vì câu hỏi có thể
   * bị admin sửa sau khi học viên bắt đầu làm bài.
   */
  async executeForSession(
    userId: string,
    quizId: string,
    answers: Record<string, number>,
    startedAt: Date,
    questions: QuizReviewSourceQuestion[],
    sessionId: string,
    forceTimeout = false,
  ) {
    const quiz = await this.quizRepository.findById(quizId);
    if (!quiz) throw DomainError.notFound(ErrorCode.QUIZ_NOT_FOUND, 'Quiz not found.');
    return this.executeForQuestions(userId, quiz, answers, startedAt.toISOString(), questions, sessionId, forceTimeout);
  }

  private async executeForQuestions(
    userId: string,
    quiz: { id: string; questions: Array<{ id: string; correctAnswerIndex: number }>; passingScorePercent: number; timeLimitSeconds?: number; xpReward: number; title: string },
    answers: Record<string, number>,
    startTime: string | undefined,
    questions: QuizReviewSourceQuestion[],
    sessionId?: string,
    forceTimeout = false,
  ) {
    const passingThreshold = quiz.passingScorePercent;
    const limit = quiz.timeLimitSeconds;

    // UC41: Delegate grading business rules to Domain Service (Pure Computation)
    const grading = this.quizGradingService.grade(
      questions,
      answers,
      passingThreshold,
      startTime,
      limit,
    );

    const isTimeout = grading.isTimeout || forceTimeout;
    const passed = !isTimeout && grading.score >= passingThreshold;
    const xpRewarded = passed ? quiz.xpReward : 0;

    // Domain factory validation
    const completedAt = new Date();
    const startedAt = startTime ? new Date(startTime) : undefined;
    const durationSeconds = startedAt
      ? Math.max(0, Math.floor((completedAt.getTime() - startedAt.getTime()) / 1000))
      : undefined;
    const attemptEntity = QuizAttempt.createNew({
      quizId: quiz.id,
      userId,
      score: grading.score,
      answers,
      passed,
      passingScorePercent: passingThreshold,
      xpRewarded,
      isTimeout,
      startedAt,
      sessionId,
      durationSeconds,
      gradedAt: completedAt,
      reviewQuestions: buildQuizReviewQuestions(questions, answers),
    });

    // Save attempt using repository
    const attempt = await this.quizAttemptRepository.create(attemptEntity);
    const attemptId = attempt.id;

    // ─────────────────────────────────────────────────────────────
    // NON-CRITICAL EVENTS
    // ─────────────────────────────────────────────────────────────
    this.eventPublisher.publish(
      'quiz.submitted',
      new QuizAttemptSubmittedEvent(userId, quiz.id, attemptId, grading.score, passed),
    );

    if (passed) {
      this.eventPublisher.publish(
        'quiz.passed',
        new QuizPassedEvent(
          userId,
          quiz.id,
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
      passed,
      xpRewarded,
      passingScorePercent: passingThreshold,
      isTimeout,
    };
  }
}
