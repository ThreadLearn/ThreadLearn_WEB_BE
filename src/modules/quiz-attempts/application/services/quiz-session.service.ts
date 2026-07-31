import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { BadRequestError, NotFoundError } from '../../../../common/custom-error';
import { LEARNING_ACCESS, ILearningAccess, LearningAccessViewer } from '../../../../shared/domain/interfaces/learning-access.port';
import { QuizBankQuestion, QuizQuestionBank } from '../../../quiz/infrastructure/persistence/schemas/quiz-question-bank.schema';
import { Quiz as QuizModel } from '../../../quiz/infrastructure/persistence/schemas/quiz.schema';
import { QUIZ_ATTEMPT_REPOSITORY, IQuizAttemptRepository } from '../../domain/interfaces/quiz-attempt.repository';
import { SubmitAttemptService } from './submit-attempt.service';
import { QuizSession } from '../../infrastructure/persistence/schemas/quiz-session.schema';

type QuizViewer = LearningAccessViewer & { id: string };

@Injectable()
export class QuizSessionService {
  constructor(
    @Inject(LEARNING_ACCESS) private readonly learningAccess: ILearningAccess,
    @Inject(QUIZ_ATTEMPT_REPOSITORY) private readonly quizAttemptRepository: IQuizAttemptRepository,
    private readonly submitAttempt: SubmitAttemptService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async recoverStaleSubmissions() {
    const cutoff = new Date(Date.now() - 5 * 60_000);
    await QuizSession.updateMany(
      { status: 'submitting', submittingAt: { $lt: cutoff } },
      { $set: { status: 'in_progress' }, $unset: { submittingAt: 1, submissionKey: 1 } },
    ).exec();
  }

  async start(lessonId: string, user: QuizViewer) {
    if (!mongoose.isValidObjectId(lessonId)) throw new BadRequestError('Invalid lesson id.');
    await this.recoverStaleSubmissions();
    await this.learningAccess.assertLessonInteractionAccess(lessonId, user);
    const quiz = await QuizModel.findOne({ lessonId, isDeleted: { $ne: true } }).exec();
    if (!quiz) throw new NotFoundError('Quiz not found for this lesson.');

    const existing = await QuizSession.findOne({ userId: user.id, quizId: quiz._id, status: 'in_progress' }).sort({ startedAt: -1 }).exec();
    if (existing) {
      if (!existing.expiresAt || existing.expiresAt.getTime() > Date.now()) return this.toStudentResponse(existing, quiz);
      existing.status = 'expired';
      await existing.save();
    }

    const questions = await this.drawQuestions(quiz, user.id);
    if (!questions.length) throw new BadRequestError('This quiz does not have enough active questions.');
    const startedAt = new Date();
    const timeLimit = quiz.timeLimitSeconds ?? quiz.timeLimit;
    const expiresAt = timeLimit && timeLimit > 0 ? new Date(startedAt.getTime() + timeLimit * 1000) : undefined;
    try {
      const session = await QuizSession.create({ quizId: quiz._id, lessonId: quiz.lessonId, userId: user.id, status: 'in_progress', questions, answers: {}, startedAt, expiresAt });
      return this.toStudentResponse(session, quiz);
    } catch (error: any) {
      if (error?.code !== 11000) throw error;
      const raced = await QuizSession.findOne({ userId: user.id, quizId: quiz._id, status: 'in_progress' }).exec();
      if (!raced) throw error;
      return this.toStudentResponse(raced, quiz);
    }
  }

  async get(sessionId: string, user: QuizViewer) {
    const session = await this.getOwnedSession(sessionId, user.id);
    const quiz = await QuizModel.findById(session.quizId).exec();
    if (!quiz) throw new NotFoundError('Quiz not found.');
    return this.toStudentResponse(session, quiz);
  }

  async saveAnswers(sessionId: string, user: QuizViewer, answers: Record<string, number>) {
    const session = await this.getOwnedSession(sessionId, user.id);
    await this.learningAccess.assertLessonInteractionAccess(String(session.lessonId), user);
    await this.assertActive(session);
    // A manual submission must be complete. At/after the server deadline we
    // accept the partial autosaved snapshot so the timeout can be graded.
    const isTimedOut = Boolean(session.expiresAt && session.expiresAt.getTime() <= Date.now());
    this.assertAnswers(session, answers, !isTimedOut);
    session.answers = answers;
    await session.save();
    return { attemptSessionId: String(session._id), answers: session.answers, savedAt: session.updatedAt };
  }

  async submit(sessionId: string, user: QuizViewer, answers: Record<string, number>, idempotencyKey?: string) {
    const session = await this.getOwnedSession(sessionId, user.id, true);
    await this.learningAccess.assertLessonInteractionAccess(String(session.lessonId), user);
    const key = idempotencyKey?.trim() || String(session._id);
    if (session.status === 'submitted') return this.getStoredResult(session, user.id, key);
    await this.assertActive(session);
    this.assertAnswers(session, answers);

    const claimed = await QuizSession.findOneAndUpdate(
      { _id: session._id, status: 'in_progress' },
      { $set: { status: 'submitting', submittingAt: new Date(), submissionKey: key, answers } },
      { new: true },
    ).select('+questions.correctAnswerIndex').exec();
    if (!claimed) {
      const latest = await this.getOwnedSession(sessionId, user.id, true);
      if (latest.status === 'submitted') return this.getStoredResult(latest, user.id, key);
      throw new BadRequestError('This quiz session is already being submitted.');
    }
    try {
      const result = await this.submitAttempt.executeForSession(
        user.id,
        String(claimed.quizId),
        answers,
        claimed.startedAt,
        claimed.questions.map((question) => ({ id: String(question.sourceQuestionId), correctAnswerIndex: question.correctAnswerIndex })),
        String(claimed._id),
      );
      await QuizSession.updateOne(
        { _id: claimed._id, status: 'submitting' },
        { $set: { status: 'submitted', submittedAt: new Date(), quizAttemptId: result.attempt.id }, $unset: { submittingAt: 1 } },
      ).exec();
      return result;
    } catch (error: any) {
      // The unique sparse QuizAttempt.sessionId index protects exactly-once
      // grading when a prior process persisted the attempt but died before it
      // could update the session document.
      if (error?.code === 11000) {
        const existingAttempt = await this.quizAttemptRepository.findBySessionIdAndUser(String(claimed._id), user.id);
        if (existingAttempt) {
          await QuizSession.updateOne(
            { _id: claimed._id },
            { $set: { status: 'submitted', submittedAt: new Date(), quizAttemptId: existingAttempt.id }, $unset: { submittingAt: 1 } },
          ).exec();
          return this.toResultFromAttempt(existingAttempt);
        }
      }
      await QuizSession.updateOne({ _id: claimed._id, status: 'submitting' }, { $set: { status: 'in_progress' }, $unset: { submittingAt: 1, submissionKey: 1 } }).exec();
      throw error;
    }
  }

  private async getStoredResult(session: any, userId: string, key: string) {
    if (!session.quizAttemptId) throw new BadRequestError('The prior submission result is still being finalized.');
    if (session.submissionKey && session.submissionKey !== key) throw new BadRequestError('This session was submitted with a different idempotency key.');
    const attempt = await this.quizAttemptRepository.findByIdAndUser(String(session.quizAttemptId), userId);
    if (!attempt) throw new NotFoundError('Quiz attempt not found.');
    return this.toResultFromAttempt(attempt);
  }

  private toResultFromAttempt(attempt: any) {
    const props = attempt.toProps();
    return { attempt, score: props.score, passed: props.passed, xpRewarded: props.xpRewarded ?? 0, passingScorePercent: props.passingScorePercent ?? 80, isTimeout: props.isTimeout ?? false };
  }

  private async getOwnedSession(sessionId: string, userId: string, includeAnswerKey = false) {
    if (!mongoose.isValidObjectId(sessionId)) throw new NotFoundError('Quiz session not found.');
    const query = QuizSession.findOne({ _id: sessionId, userId });
    if (includeAnswerKey) query.select('+questions.correctAnswerIndex');
    const session = await query.exec();
    if (!session) throw new NotFoundError('Quiz session not found.');
    return session;
  }

  private async assertActive(session: any) {
    if (session.status !== 'in_progress') throw new BadRequestError('This quiz session is no longer active.');
    if (session.expiresAt && session.expiresAt.getTime() + 15_000 < Date.now()) {
      await QuizSession.updateOne(
        { _id: session._id, status: 'in_progress' },
        { $set: { status: 'expired' } },
      ).exec();
      throw new BadRequestError('This quiz session has expired.');
    }
  }

  private assertAnswers(session: any, answers: Record<string, number>, requireAllAnswers = false) {
    if (!answers || typeof answers !== 'object') throw new BadRequestError('answers must be an object.');
    const questions = new Map<string, any>(session.questions.map((question: any) => [String(question.sourceQuestionId), question]));
    for (const [questionId, selectedOption] of Object.entries(answers)) {
      const question = questions.get(questionId);
      if (!question) throw new BadRequestError('answers contains a question outside this session.');
      if (!Number.isInteger(selectedOption) || selectedOption < 0 || selectedOption >= question.options.length) {
        throw new BadRequestError('answers contains an invalid option index.');
      }
    }
    if (requireAllAnswers && questions.size !== Object.keys(answers).length) {
      throw new BadRequestError('All quiz questions must be answered before submitting.');
    }
  }

  private async drawQuestions(quiz: any, userId: string) {
    const desiredCount = quiz.useQuestionBank ? quiz.randomQuestionCount ?? 5 : Math.min(quiz.randomQuestionCount ?? 5, quiz.questions.length);
    if (quiz.useQuestionBank) {
      const bank = await QuizQuestionBank.findOne({ quizId: quiz._id, status: 'published' }).lean().exec();
      if (!bank || bank.activeQuestionCount < desiredCount) throw new BadRequestError('The published question library does not contain enough active questions.');
      const recent = await QuizSession.find({ userId, quizId: quiz._id, status: { $in: ['submitted', 'expired', 'abandoned'] } })
        .sort({ startedAt: -1 }).limit(3).select('questions.sourceQuestionId').lean().exec();
      const excludedIds = [...new Set(recent.flatMap((item) => item.questions.map((question: any) => String(question.sourceQuestionId))) )]
        .filter(mongoose.isValidObjectId).map((id) => new mongoose.Types.ObjectId(id));
      const baseMatch = { quizId: quiz._id, status: 'active' };
      const unseenCount = excludedIds.length ? await QuizBankQuestion.countDocuments({ ...baseMatch, _id: { $nin: excludedIds } }) : 0;
      const pipeline = unseenCount >= desiredCount
        ? [{ $match: { ...baseMatch, _id: { $nin: excludedIds } } }, { $sample: { size: desiredCount } }]
        : [{ $match: baseMatch }, { $sample: { size: desiredCount } }];
      const source = await QuizBankQuestion.aggregate(pipeline).exec();
      return source.map((question) => this.toSessionQuestion(question));
    }
    return this.shuffle([...quiz.questions]).slice(0, desiredCount).map((question: any) => {
      const options = this.shuffle<{ optionId: string; text: string }>(question.options.map((text: string, index: number) => ({ optionId: `o${index + 1}`, text })));
      return { sourceQuestionId: question._id, questionText: question.questionText, options, correctAnswerIndex: options.findIndex((option) => option.optionId === `o${question.correctAnswerIndex + 1}`) };
    });
  }

  private toSessionQuestion(question: any) {
    const options = this.shuffle<{ optionId: string; text: string }>(question.options.map((option: any) => ({ optionId: String(option.optionId), text: String(option.text) })));
    return { sourceQuestionId: question._id, questionText: question.questionText, options, correctAnswerIndex: options.findIndex((option) => option.optionId === question.correctOptionId), explanation: question.explanation };
  }

  private toStudentResponse(session: any, quiz: any) {
    return {
      attemptSessionId: String(session._id), startedAt: session.startedAt, expiresAt: session.expiresAt, status: session.status, answers: session.answers ?? {},
      _id: String(quiz._id), id: String(quiz._id), title: quiz.title, description: quiz.description, lessonId: String(quiz.lessonId),
      passingScorePercent: quiz.passingScorePercent ?? quiz.passingScore ?? 80, passingScore: quiz.passingScorePercent ?? quiz.passingScore ?? 80,
      xpReward: quiz.xpReward ?? 100, timeLimitSeconds: quiz.timeLimitSeconds ?? quiz.timeLimit, timeLimit: quiz.timeLimitSeconds ?? quiz.timeLimit ?? 1800,
      questions: session.questions.map((question: any) => ({ _id: String(question.sourceQuestionId), id: String(question.sourceQuestionId), questionText: question.questionText, options: question.options.map((option: any) => option.text) })),
    };
  }

  private shuffle<T>(items: T[]): T[] {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = crypto.randomInt(index + 1);
      [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }
    return copy;
  }
}
