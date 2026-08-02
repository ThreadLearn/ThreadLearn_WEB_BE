import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { firstValueFrom } from 'rxjs';
import { BadRequestError, NotFoundError, TooManyRequestsError } from '../../../../common/custom-error';
import { env } from '../../../../configs/env';
import { AIHistoryEntity } from '../../domain/entities/ai-history.entity';
import {
  AI_HISTORY_REPOSITORY,
  IAIHistoryRepository,
} from '../../domain/interfaces/ai-history.repository';
import { AIRecommendationPayload } from '../dto/ai.dto';
import { buildExplanation } from './build-explanation';
import { hasActiveSubscriptionFeature } from '../../../../shared/domain/subscription-features';
import { presentAnalysisForTier } from './ai-tier-policy';

const FREE_DAILY_LIMIT = 10;
const PREMIUM_DAILY_LIMIT = Number(process.env.AI_PREMIUM_DAILY_LIMIT || 999);

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

export interface AssignmentAiFeedback {
  summary: string;
  suggestions: string[];
  timeComplexity: string;
  memoryComplexity: string;
}

@Injectable()
export class RequestRecommendationService {
  constructor(
    @Inject(AI_HISTORY_REPOSITORY) private readonly histories: IAIHistoryRepository,
    private readonly http: HttpService
  ) {}

  async execute(userId: string, payload: AIRecommendationPayload) {
    if (!payload.inputCode) {
      throw new BadRequestError('inputCode is required.');
    }

    const user = await this.histories.findUserProfile(userId);
    if (!user) throw new NotFoundError('User profile not found.');
    const { usedToday, limit } = await this.assertDailyLimit(userId, user.planType === 'PREMIUM');
    const canViewFixes = hasActiveSubscriptionFeature({
      planType: user.planType,
      subscriptionExpiresAt: user.subscriptionExpiresAt,
      subscriptionFeatures: user.subscriptionFeatures,
      feature: 'AI_ADVANCED_ANALYSIS',
    });

    const aiToken = jwt.sign({ sub: userId }, env.JWT_ACCESS_SECRET, { expiresIn: '5m' });

    const { data } = await firstValueFrom(
      this.http.post<AnalyzeResponse>(
        `${env.AI_API_URL}/api/v1/ai/analyze`,
        { code: payload.inputCode, language: payload.language, user_id: userId },
        { timeout: env.AI_API_TIMEOUT_MS, headers: { Authorization: `Bearer ${aiToken}` } }
      )
    );

    const issues = data.issues ?? [];
    const suggestions = issues.map((issue) => `[${issue.severity}] ${issue.description}`);
    const raceConditions = issues.map((issue) => `${issue.line_range}: ${issue.description}`);
    const tierAnalysis = presentAnalysisForTier({
      optimizedCode: issues[0]?.fix,
      issues: issues.map((issue) => ({
        patternId: issue.pattern_id ?? 'unknown',
        lineRange: issue.line_range,
        severity: issue.severity,
        description: issue.description,
        fix: issue.fix,
      })),
    }, canViewFixes);
    const explanation = buildExplanation(issues.length, (data.docs_used ?? []).length);
    const response = [
      '### AI Code Analysis',
      '',
      ...issues.map(
        (issue, index) =>
          `${index + 1}. [${issue.severity}] ${issue.line_range}: ${issue.description}`
      ),
      '',
      explanation,
    ].join('\n');

    const created: any = await this.histories.create(
      AIHistoryEntity.createNew({
        userId,
        codeExecutionId: payload.codeExecutionId,
        inputCode: payload.inputCode,
        language: payload.language,
        prompt: `Analyze this ${payload.language} snippet for concurrent programming issues.`,
        response,
        suggestions,
        raceConditions,
        optimizedCode: tierAnalysis.optimizedCode,
        explanation,
        modelName: 'threadlearn-ai2-server',
        category: 'code-analysis',
        issues: tierAnalysis.issues,
        docsUsed: (data.docs_used ?? []).map((doc) => ({
          id: doc.id,
          title: doc.title,
          category: doc.category,
          content: doc.content,
          score: doc.bm25_score,
        })),
        cached: data.cached ?? false,
      })
    );
    created.remainingQuota = Math.max(0, limit - usedToday - 1);
    created.quotaLimit = limit;
    return created;
  }

  /**
   * Assignment feedback is system-triggered after grading. It deliberately
   * bypasses the learner's Advisor quota and receives no hidden test data.
   */
  async analyzeAssignment(userId: string, inputCode: string, language: string): Promise<AssignmentAiFeedback> {
    const aiToken = jwt.sign({ sub: userId, scope: 'assignment-feedback' }, env.JWT_ACCESS_SECRET, { expiresIn: '5m' });
    const { data } = await firstValueFrom(
      this.http.post<AnalyzeResponse>(
        `${env.AI_API_URL}/api/v1/ai/analyze`,
        { code: inputCode, language, user_id: userId },
        { timeout: env.AI_API_TIMEOUT_MS, headers: { Authorization: `Bearer ${aiToken}` } },
      ),
    );
    const issues = data.issues ?? [];
    const nestedLoops = (inputCode.match(/\b(for|while)\b/g) ?? []).length >= 2;
    return {
      summary: issues.length ? `AI found ${issues.length} area${issues.length === 1 ? '' : 's'} to review.` : 'AI found no obvious issues in this submission.',
      suggestions: issues.slice(0, 5).map((issue) => issue.fix || issue.description),
      timeComplexity: nestedLoops ? 'Likely O(n²) or higher; verify whether nested loops are necessary.' : 'Review loop bounds against input constraints.',
      memoryComplexity: /\b(array|list|map|set|dict)\b/i.test(inputCode) ? 'Uses auxiliary collections; memory may grow with input.' : 'Likely O(1) auxiliary memory, subject to runtime behavior.',
    };
  }

  private async assertDailyLimit(userId: string, premium: boolean) {
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    const usedToday = await this.histories.countToday(userId, since);
    const limit = premium ? PREMIUM_DAILY_LIMIT : FREE_DAILY_LIMIT;
    if (usedToday >= limit) {
      throw new TooManyRequestsError('AI usage quota exceeded.', 'AI_QUOTA_EXCEEDED');
    }
    return { usedToday, limit };
  }
}
