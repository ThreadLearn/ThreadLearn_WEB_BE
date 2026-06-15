import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Quiz, QuizDocument } from '../../quiz/schemas/quiz.schema';
// Các model dưới đây CÒN MONGOOSE THUẦN — gọi static qua aggregator.
// Sẽ chuyển sang DI khi migrate cụm tương ứng.
import { QuizAttempt, UserStats, Notification } from '@/database/models';
import { NotFoundError } from '../../../common/custom-error';

@Injectable()
export class QuizAttemptsService {
  constructor(
    @InjectModel(Quiz.name) private readonly quizModel: Model<QuizDocument>,
  ) {}

  async submitAttempt(userId: string, quizId: string, answers: Record<string, number>) {
    const quiz = await this.quizModel.findById(quizId);
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

    const passingThreshold = quiz.passingScorePercent !== undefined ? quiz.passingScorePercent : 80;
    const score = Math.round((correctCount / questions.length) * 100);
    const passed = score >= passingThreshold;

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
    };
  }
}
