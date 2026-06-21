import { AIHistory } from '../models/ai-history.model';
import { User } from '../../auth/models/user.model';
import { Course } from '../../courses/models/course.model';
import { LessonsService } from '../../lessons/services/lessons.service';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../common/custom-error';

export interface AIRecommendationPayload {
  courseId?: string;
  lessonId?: string;
  codeExecutionId?: string;
  inputCode?: string;
  language?: string;
  prompt?: string;
}

const FREE_DAILY_LIMIT = 10;
const PREMIUM_DAILY_LIMIT = Number(process.env.AI_PREMIUM_DAILY_LIMIT || 40);

export class AIService {
  static async requestRecommendation(userId: string, payload: AIRecommendationPayload | string) {
    const normalized: AIRecommendationPayload =
      typeof payload === 'string' ? { courseId: payload } : payload;

    if (!normalized.courseId && !normalized.lessonId) {
      throw new BadRequestError('courseId or lessonId is required.');
    }

    const [user, course] = await Promise.all([
      User.findById(userId),
      normalized.courseId ? Course.findById(normalized.courseId) : null,
    ]);

    if (!user) throw new NotFoundError('User profile not found.');
    if (normalized.courseId && !course) throw new NotFoundError('Course profile not found.');

    let lessonTitle = '';
    let courseId = normalized.courseId;
    if (normalized.lessonId) {
      const lesson = await LessonsService.assertLessonAccess(normalized.lessonId, {
        id: userId,
        role: 'STUDENT',
      });
      lessonTitle = lesson.title;
      courseId = courseId ?? lesson.courseId.toString();
    }

    const isPremiumTier =
      user.role === 'ADMIN' ||
      (user.planType === 'PREMIUM' &&
        (!user.subscriptionExpiresAt || user.subscriptionExpiresAt.getTime() > Date.now()));
    await this.assertDailyLimit(userId, isPremiumTier);

    const targetName = course?.title ?? lessonTitle ?? 'current lesson';
    const prompt =
      normalized.prompt ||
      (normalized.inputCode
        ? `Analyze this ${normalized.language ?? 'code'} snippet for concurrent programming issues in "${targetName}".`
        : `Generate a personalized learning recommendations roadmap for student ${user.firstName} ${user.lastName} taking "${targetName}".`);

    const suggestions = normalized.inputCode
      ? [
          'Identify shared mutable state and protect it with a clear synchronization strategy.',
          'Keep critical sections small and avoid blocking operations while holding locks.',
          'Add deterministic tests for interleavings that can expose races.',
        ]
      : [
          'Review the prerequisite concepts before moving to coding lessons.',
          'Complete lessons sequentially and run each code snippet in the IDE.',
          'Use notes and bookmarks for race-condition examples you want to revisit.',
        ];

    const raceConditions = normalized.inputCode
      ? ['Potential race conditions require runtime context; inspect shared variables and unsynchronized writes.']
      : [];

    const explanation = normalized.inputCode
      ? 'The analysis focuses on concurrency risks, synchronization boundaries, and readability. Configure an OpenAI provider later to replace this deterministic local advisor.'
      : `This roadmap prioritizes steady progress through ${targetName} and keeps practice tied to lesson completion.`;

    const response = [
      `### AI Recommendation for "${targetName}"`,
      '',
      ...suggestions.map((item, index) => `${index + 1}. ${item}`),
      '',
      explanation,
    ].join('\n');

    return AIHistory.create({
      userId,
      courseId,
      lessonId: normalized.lessonId,
      codeExecutionId: normalized.codeExecutionId,
      inputCode: normalized.inputCode,
      language: normalized.language,
      prompt,
      response,
      suggestions,
      raceConditions,
      optimizedCode: normalized.inputCode,
      explanation,
      tokenUsage: Math.ceil((prompt.length + response.length) / 4),
      modelName: 'threadlearn-local-advisor',
      status: 'completed',
      category: normalized.inputCode ? 'code-recommendation' : 'recommendation',
    });
  }

  static async getHistoryLogs(userId: string) {
    return AIHistory.find({ userId }).sort({ createdAt: -1 });
  }

  static async getHistoryById(userId: string, id: string) {
    const history = await AIHistory.findOne({ _id: id, userId });
    if (!history) throw new NotFoundError('AI_HISTORY_NOT_FOUND');
    return history;
  }

  static async updateFeedback(userId: string, id: string, feedbackRating: number) {
    const updated = await AIHistory.findOneAndUpdate(
      { _id: id, userId },
      { feedbackRating },
      { new: true }
    );
    if (!updated) throw new NotFoundError('AI history not found.');
    return updated;
  }

  private static async assertDailyLimit(userId: string, isPremium: boolean) {
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    const usedToday = await AIHistory.countDocuments({ userId, createdAt: { $gte: since } });
    const limit = isPremium ? PREMIUM_DAILY_LIMIT : FREE_DAILY_LIMIT;
    if (usedToday >= limit) {
      throw new ForbiddenError('AI_USAGE_LIMIT_EXCEEDED');
    }
  }
}

export default AIService;
