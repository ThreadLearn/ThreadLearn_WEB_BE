import { Inject, Injectable } from '@nestjs/common';
import { Quiz } from '../../../quiz/models/quiz.model';
import { UserStats } from '../../../gamification/models/user-stats.model';
import { Notification } from '../../../notifications/models/notification.model';
import { NotFoundError } from '../../../../common/custom-error';
import { LeaderboardService } from '../../../leaderboard/services/leaderboard.service';
import { IQuizAttemptRepository } from '../../domain/interfaces/quiz-attempt.repository';
import { IQuizAttempt } from '../../models/quiz-attempt.model';

/**
 * UC40: Take Quiz (Student)
 * UC41: Grade Quiz (System)
 * Service to process student's quiz submissions, verify limits, grade correctness, award XP and record result.
 */
@Injectable()
export class SubmitAttemptService {
  constructor(
    @Inject('IQuizAttemptRepository')
    private readonly quizAttemptRepository: IQuizAttemptRepository,
  ) {}

  async execute(
    userId: string,
    quizId: string,
    answers: Record<string, number>,
    startTime?: string,
  ) {
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      throw new NotFoundError('Quiz not found.');
    }

    const { questions } = quiz;
    let correctCount = 0;

    questions.forEach((question, index) => {
      const questionId = question._id?.toString();
      const userAnswer =
        (questionId ? answers[questionId] : undefined) ??
        answers[index.toString()];
      if (userAnswer === question.correctAnswerIndex) {
        correctCount++;
      }
    });

    const passingThreshold = quiz.passingScorePercent ?? quiz.passingScore ?? 80;

    // UC40: Check time limit
    const now = new Date();
    let score = Math.round((correctCount / questions.length) * 100);
    let isTimeout = false;

    if (startTime) {
      const startedAt = new Date(startTime);
      // fallback sequence: timeLimit -> timeLimitSeconds -> default 1800
      const limit = quiz.timeLimit ?? quiz.timeLimitSeconds ?? 1800;
      const elapsedSeconds = (now.getTime() - startedAt.getTime()) / 1000;

      // Allow 15 seconds buffer for network latency
      if (elapsedSeconds > limit + 15) {
        isTimeout = true;
        score = 0; // automatically fail the quiz with 0 score
      }
    }

    const passed = !isTimeout && score >= passingThreshold;

    const attempt = await this.quizAttemptRepository.create({
      quizId: quizId as any,
      userId: userId as any,
      score,
      answers,
      passed,
      startedAt: startTime ? new Date(startTime) : undefined,
    } as Partial<IQuizAttempt>);

    let xpRewarded = 0;
    if (passed) {
      xpRewarded = quiz.xpReward;
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
        await LeaderboardService.invalidateCache();
      }

      await Notification.create({
        userId,
        title: 'Quiz Completed Successfully! 🎉',
        message: `You passed "${quiz.title}" with a score of ${score}% and earned ${xpRewarded} XP!`,
        type: 'ACHIEVEMENT',
      });
    }

    return {
      attempt,
      score,
      passed,
      xpRewarded,
      passingScorePercent: passingThreshold,
      isTimeout,
    };
  }
}
