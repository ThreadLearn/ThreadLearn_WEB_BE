import { QuizAttempt } from '../models/quiz-attempt.model';
import { Quiz } from '../../quiz/models/quiz.model';
import { UserStats } from '../../gamification/models/user-stats.model';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { NotFoundError } from '../../../common/custom-error';
import { logger } from '../../../configs/logger';

export class QuizAttemptsService {
  static async submitAttempt(userId: string, quizId: string, answers: Record<string, number>) {
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      throw new NotFoundError('Quiz not found.');
    }

    const { questions } = quiz;
    let correctCount = 0;

    questions.forEach((question, index) => {
      const userAnswer = answers[index.toString()];
      if (userAnswer === question.correctAnswerIndex) {
        correctCount++;
      }
    });

    const score = Math.round((correctCount / questions.length) * 100);
    const passed = score >= 80;

    const attempt = await QuizAttempt.create({
      quizId,
      userId,
      score,
      answers,
      passed,
    });

    let xpRewarded = 0;

    if (passed) {
      xpRewarded = quiz.xpReward;
      const stats = await UserStats.findOne({ userId });

      if (stats) {
        const oldLevel = stats.level;

        stats.xp += xpRewarded;
        stats.quizzesCompleted += 1;

        const now = new Date();
        const lastActive = new Date(stats.lastActiveDate);
        const dayDiff = Math.floor(
          (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (dayDiff === 1) {
          stats.currentStreak += 1;
          if (stats.currentStreak > stats.highestStreak) {
            stats.highestStreak = stats.currentStreak;
          }
        } else if (dayDiff > 1) {
          stats.currentStreak = 1;
        } else if (stats.currentStreak === 0) {
          stats.currentStreak = 1;
        }

        stats.lastActiveDate = now;
        stats.level = Math.floor(stats.xp / 1000) + 1;
        await stats.save();

        // Notifications — fire-and-forget so failures don't block the response
        try {
          await NotificationsService.notify(
            userId,
            'QUIZ_PASSED',
            'Quiz hoàn thành xuất sắc! 🎉',
            `Bạn đã vượt qua "${quiz.title}" với ${score}% và nhận ${xpRewarded} XP!`,
            { quizId: quiz._id, score, xpRewarded }
          );

          if (stats.level > oldLevel) {
            await NotificationsService.notify(
              userId,
              'LEVEL_UP',
              `Lên Level ${stats.level}! 🚀`,
              `Chúc mừng! Bạn đã đạt Level ${stats.level}.`,
              { newLevel: stats.level, xp: stats.xp }
            );
          }
        } catch (err) {
          logger.warn('Quiz pass notification failed (non-critical).', err);
        }
      }
    } else {
      try {
        await NotificationsService.notify(
          userId,
          'QUIZ_FAILED',
          'Chưa đạt — thử lại nhé! 💪',
          `Bạn đạt ${score}% trong "${quiz.title}". Cần ≥ 80% để qua.`,
          { quizId: quiz._id, score }
        );
      } catch (err) {
        logger.warn('Quiz fail notification failed (non-critical).', err);
      }
    }

    return {
      attempt,
      score,
      passed,
      xpRewarded,
    };
  }
}

export default QuizAttemptsService;
