import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { firstValueFrom } from 'rxjs';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../../common/custom-error';
import { env } from '../../../../configs/env';
import { AIHistoryEntity } from '../../domain/entities/ai-history.entity';
import { AI_HISTORY_REPOSITORY, IAIHistoryRepository } from '../../domain/interfaces/ai-history.repository';
import { AIRecommendationPayload } from '../dto/ai.dto';
import { buildExplanation } from './build-explanation';

const FREE_DAILY_LIMIT = 10;
const PREMIUM_DAILY_LIMIT = Number(process.env.AI_PREMIUM_DAILY_LIMIT || 40);

interface AnalyzeIssue {
  line_range: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  fix: string;
  pattern_id?: string;
}

interface AnalyzeKnowledgeDoc {
  id: string;
  title: string;
  category?: string;
  content?: string;
  bm25_score?: number;
}

interface AnalyzeResponse {
  user_id: string;
  language: string;
  issues: AnalyzeIssue[];
  docs_used: AnalyzeKnowledgeDoc[];
  cached: boolean;
}

@Injectable()
export class RequestRecommendationService {
  constructor(
    @Inject(AI_HISTORY_REPOSITORY) private readonly histories: IAIHistoryRepository,
    private readonly http: HttpService,
  ) {}

  async execute(userId: string, payload: AIRecommendationPayload) {
    if (!payload.inputCode) {
      throw new BadRequestError('inputCode is required.');
    }

    const user = await this.histories.findUserProfile(userId);
    if (!user) throw new NotFoundError('User profile not found.');

    const isPremiumTier =
      user.role === 'ADMIN' ||
      (user.planType === 'PREMIUM' &&
        (!user.subscriptionExpiresAt || user.subscriptionExpiresAt.getTime() > Date.now()));
    await this.assertDailyLimit(userId, isPremiumTier);

    const aiToken = jwt.sign({ sub: userId }, env.JWT_ACCESS_SECRET, { expiresIn: '5m' });

    const { data } = await firstValueFrom(
      this.http.post<AnalyzeResponse>(
        `${env.AI_API_URL}/api/v1/ai/analyze`,
        { code: payload.inputCode, language: payload.language, user_id: userId },
        { timeout: env.AI_API_TIMEOUT_MS, headers: { Authorization: `Bearer ${aiToken}` } },
      ),
    );

    const issues = data.issues ?? [];
    const suggestions = issues.map((issue) => `[${issue.severity}] ${issue.description}`);
    const raceConditions = issues.map((issue) => `${issue.line_range}: ${issue.description}`);
    const optimizedCode = issues[0]?.fix;
    const explanation = buildExplanation(issues.length, (data.docs_used ?? []).length);
    const response = [
      '### AI Code Analysis',
      '',
      ...issues.map((issue, index) => `${index + 1}. [${issue.severity}] ${issue.line_range}: ${issue.description}`),
      '',
      explanation,
    ].join('\n');

    return this.histories.create(
      AIHistoryEntity.createNew({
        userId,
        codeExecutionId: payload.codeExecutionId,
        inputCode: payload.inputCode,
        language: payload.language,
        prompt: `Analyze this ${payload.language} snippet for concurrent programming issues.`,
        response,
        suggestions,
        raceConditions,
        optimizedCode,
        explanation,
        modelName: 'threadlearn-ai2-server',
        category: 'code-analysis',
        issues: issues.map((issue) => ({
          patternId: issue.pattern_id ?? 'unknown',
          lineRange: issue.line_range,
          severity: issue.severity,
          description: issue.description,
          fix: issue.fix,
        })),
        docsUsed: (data.docs_used ?? []).map((doc) => ({
          id: doc.id,
          title: doc.title,
          category: doc.category,
          content: doc.content,
          score: doc.bm25_score,
        })),
        cached: data.cached ?? false,
      }),
    );
  }

  private async assertDailyLimit(userId: string, isPremium: boolean) {
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    const usedToday = await this.histories.countToday(userId, since);
    const limit = isPremium ? PREMIUM_DAILY_LIMIT : FREE_DAILY_LIMIT;
    if (usedToday >= limit) throw new ForbiddenError('AI_USAGE_LIMIT_EXCEEDED');
  }
}
