import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import mongoose from 'mongoose';
import { IQuizAttempt } from '../models/quiz-attempt.model';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../common/custom-error';

@Injectable()
export class QuizAttemptsService {
  private readonly logger = new Logger(QuizAttemptsService.name);

  constructor(
    @InjectModel('QuizAttempt') private attemptModel:   Model<IQuizAttempt>,
    @InjectModel('Quiz')        private quizModel:      Model<any>,
    @InjectModel('UserStats')   private userStatsModel: Model<any>,
    @InjectModel('Lesson')      private lessonModel:    Model<any>,
    @InjectModel('Enrollment')  private enrollmentModel: Model<any>,
    private readonly notifications: NotificationsService,
  ) {}

  async submitAttempt(userId: string, quizId: string, answers: Record<string, number>) {
    if (!mongoose.isValidObjectId(quizId)) throw new NotFoundError('Quiz not found.');
    const quiz = await this.quizModel.findById(quizId);
    if (!quiz) throw new NotFoundError('Quiz not found.');

    const { questions } = quiz;
    if (!Array.isArray(questions) || questions.length === 0) {
      // L25 — empty questions guard, prevent NaN score.
      throw new BadRequestError('Quiz has no questions to grade.');
    }

    // L23 — enrollment gate. Quiz attached to lesson — verify enrollment in
    // the course owning that lesson.
    if (quiz.lessonId) {
      const lesson = await this.lessonModel.findById(quiz.lessonId)
        .select('courseId').lean<{ courseId?: any } | null>();
      if (lesson?.courseId) {
        const enrolled = await this.enrollmentModel.exists({ userId, courseId: lesson.courseId });
        if (!enrolled) {
          throw new ForbiddenError('You must enroll in this course to take its quiz.');
        }
      }
    }

    let correctCount = 0;
    questions.forEach((q: any, i: number) => {
      if (answers[i.toString()] === q.correctAnswerIndex) correctCount++;
    });

    const score  = Math.round((correctCount / questions.length) * 100);
    const passed = score >= 80;

    // L24 — award XP only on FIRST pass of this quiz. Any subsequent pass
    // saves the attempt for history but XP is 0 (no exploit by re-taking).
    const previousPass = await this.attemptModel.exists({ quizId, userId, passed: true });

    const attempt = await this.attemptModel.create({ quizId, userId, score, answers, passed });

    let xpRewarded = 0;
    if (passed && !previousPass) {
      xpRewarded = quiz.xpReward;
      const stats = await this.userStatsModel.findOne({ userId });
      if (stats) {
        const oldLevel = stats.level;
        stats.xp += xpRewarded;
        stats.quizzesCompleted += 1;

        const now = new Date();
        const lastActive = new Date(stats.lastActiveDate);
        const dayDiff = Math.floor((now.getTime() - lastActive.getTime()) / 86_400_000);
        if (dayDiff === 1) {
          stats.currentStreak += 1;
          if (stats.currentStreak > stats.highestStreak) stats.highestStreak = stats.currentStreak;
        } else if (dayDiff > 1) {
          stats.currentStreak = 1;
        } else if (stats.currentStreak === 0) {
          stats.currentStreak = 1;
        }
        stats.lastActiveDate = now;
        stats.level = Math.floor(stats.xp / 1000) + 1;
        await stats.save();

        this.notifications.notify(
          userId, 'QUIZ_PASSED',
          'Quiz hoàn thành xuất sắc! 🎉',
          `Bạn đã vượt qua "${quiz.title}" với ${score}% và nhận ${xpRewarded} XP!`,
          { quizId: quiz._id, score, xpRewarded },
        ).catch((err) => this.logger.warn('QUIZ_PASSED notify failed (non-critical).', err));

        if (stats.level > oldLevel) {
          this.notifications.notify(
            userId, 'LEVEL_UP',
            `Lên Level ${stats.level}! 🚀`,
            `Chúc mừng! Bạn đã đạt Level ${stats.level}.`,
            { newLevel: stats.level, xp: stats.xp },
          ).catch((err) => this.logger.warn('LEVEL_UP notify failed (non-critical).', err));
        }
      }
    } else {
      this.notifications.notify(
        userId, 'QUIZ_FAILED',
        'Chưa đạt — thử lại nhé! 💪',
        `Bạn đạt ${score}% trong "${quiz.title}". Cần ≥ 80% để qua.`,
        { quizId: quiz._id, score },
      ).catch((err) => this.logger.warn('QUIZ_FAILED notify failed (non-critical).', err));
    }

    return { attempt, score, passed, xpRewarded };
  }

  /** UC43 — list of attempts for the signed-in user, newest first. */
  async getMyAttempts(userId: string, limit = 50) {
    return this.attemptModel.find({ userId })
      .populate('quizId', 'title xpReward')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }
}
