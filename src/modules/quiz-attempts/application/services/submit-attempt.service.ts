import { Inject, Injectable } from '@nestjs/common';
import { Quiz } from '../../../quiz/models/quiz.model';
import { QuizService } from '../../../quiz/application/services/quiz.facade';
import { QuizGradingService } from '../../domain/services/quiz-grading.service';
import { DomainEventPublisher } from '../../domain/events/domain-event.publisher';
import { QuizAttemptSubmittedEvent } from '../../domain/events/quiz-attempt-submitted.event';
import { QuizPassedEvent } from '../../domain/events/quiz-passed.event';
import { IQuizAttemptRepository } from '../../domain/interfaces/quiz-attempt.repository';
import { IQuizAttempt } from '../../models/quiz-attempt.model';
import { AwardXpService } from '../../../gamification/application/services/award-xp.service';
import { UpdateStreakService } from '../../../gamification/application/services/update-streak.service';

/**
 * UC40: Take Quiz (Student)
 * UC41: Grade Quiz (System)
 * Service to orchestrate quiz attempt submissions, maintaining critical transaction boundaries.
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
    private readonly awardXpService?: AwardXpService,
    private readonly updateStreakService?: UpdateStreakService,
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

    // UC41: Delegate grading business rules to Domain Service (Pure Computation)
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

    let xpRewarded = 0;
    if (grading.passed) {
      xpRewarded = quiz.xpReward;

      // ─────────────────────────────────────────────────────────────
      // CRITICAL TRANSACTION BOUNDARY (Save Attempt + Gamification)
      // ─────────────────────────────────────────────────────────────
      if (this.awardXpService && this.updateStreakService) {
        try {
          await this.awardXpService.execute(userId, xpRewarded, 1);
          await this.updateStreakService.execute(userId);
        } catch (error) {
          // Manual Rollback: delete quiz attempt if critical updates fail
          await this.quizAttemptRepository.deleteById(attemptId);
          throw error;
        }
      } else {
        // Fallback for isolated unit tests that bypass NestJS DI context
        const UserStats = require('../../../gamification/models/user-stats.model').UserStats;
        const stats = await UserStats.findOne({ userId });
        if (stats) {
          stats.xp += xpRewarded;
          stats.quizzesCompleted += 1;

          const now = new Date();
          const lastActive = new Date(stats.lastActiveDate);
          const dayDifference = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));

          if (dayDifference === 1) {
            stats.currentStreak += 1;
            if (stats.currentStreak > stats.highestStreak) {
              stats.highestStreak = stats.currentStreak;
            }
          } else if (dayDifference > 1) {
            stats.currentStreak = 1;
          } else if (stats.currentStreak === 0) {
            stats.currentStreak = 1;
          }

          stats.lastActiveDate = now;
          stats.level = Math.floor(stats.xp / 1000) + 1;
          await stats.save();
        }
      }
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
