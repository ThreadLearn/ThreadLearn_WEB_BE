import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { firstValueFrom } from 'rxjs';
import { BadRequestError, NotFoundError, TooManyRequestsError } from '../../../../common/custom-error';
import { env } from '../../../../configs/env';
import { hasActiveSubscriptionFeature } from '../../../../shared/domain/subscription-features';
import mongoose from 'mongoose';
import { CodeExecution } from '../../../code-execution/models/code-execution.model';
import { AIHistoryEntity } from '../../domain/entities/ai-history.entity';
import { AI_HISTORY_REPOSITORY, IAIHistoryRepository } from '../../domain/interfaces/ai-history.repository';
import { AIRecommendationPayload } from '../dto/ai.dto';
import { buildExplanation } from './build-explanation';
import { DailyQuotaReservation, DailyQuotaService } from '../../../../shared/infrastructure/quota/daily-quota.service';
import { AIAnalysisCacheService, CachedAnalysisResult } from './ai-analysis-cache.service';
import { presentAnalysisForTier } from './ai-tier-policy';

const FREE_DAILY_LIMIT = 999;
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
    private readonly quotas: DailyQuotaService,
    private readonly cache: AIAnalysisCacheService,
  ) {}

  async execute(userId: string, payload: AIRecommendationPayload) {
    if (!payload.inputCode) {
      throw new BadRequestError('inputCode is required.');
    }

    const user = await this.histories.findUserProfile(userId);
    if (!user) throw new NotFoundError('User profile not found.');

    const isPremiumTier = user.role === 'ADMIN' || hasActiveSubscriptionFeature({
      planType: user.planType,
      subscriptionExpiresAt: user.subscriptionExpiresAt,
      subscriptionFeatures: user.subscriptionFeatures,
      feature: 'AI_ADVANCED_ANALYSIS',
    });
    if (payload.codeExecutionId) {
      if (!mongoose.isValidObjectId(payload.codeExecutionId)) {
        throw new NotFoundError('Code execution not found.');
      }
      const execution = await CodeExecution.exists({ _id: payload.codeExecutionId, userId });
      if (!execution) throw new NotFoundError('Code execution not found.');
    }

    const limit = isPremiumTier ? PREMIUM_DAILY_LIMIT : FREE_DAILY_LIMIT;
    const cacheKey = this.cache.key(payload.inputCode, payload.language);
    const cached = await this.cache.get(cacheKey);
    // Cache hits create a per-user history row but do not consume the daily
    // quota: no AI-provider work has been performed.
    if (cached) {
      const history = await this.persistHistory(userId, payload, cached, isPremiumTier, true);
      return presentAnalysisForTier(
        this.withQuota(history, await this.quotas.status(userId, 'ai-recommendation', limit)),
        isPremiumTier,
      );
    }

    const reservation = await this.reserveQuota(userId, limit);

    try {
      const aiToken = jwt.sign({ sub: userId }, env.JWT_ACCESS_SECRET, { expiresIn: '5m' });
      const { data } = await firstValueFrom(
        this.http.post<AnalyzeResponse>(
          `${env.AI_API_URL}/api/v1/ai/analyze`,
          { code: payload.inputCode, language: payload.language, user_id: userId },
          { timeout: env.AI_API_TIMEOUT_MS, headers: { Authorization: `Bearer ${aiToken}` } },
        ),
      );
      await this.cache.set(cacheKey, { issues: data.issues ?? [], docs_used: data.docs_used ?? [] });
      const history = await this.persistHistory(userId, payload, data, isPremiumTier, false);
      return presentAnalysisForTier(
        this.withQuota(history, await this.quotas.status(userId, 'ai-recommendation', limit)),
        isPremiumTier,
      );
    } catch (error) {
      await this.quotas.release(reservation);
      throw error;
    }
  }

  private async reserveQuota(userId: string, limit: number): Promise<DailyQuotaReservation> {
    const reservation = await this.quotas.reserve(userId, 'ai-recommendation', limit);
    if (!reservation) throw new TooManyRequestsError('Daily AI analysis quota exceeded.', 'AI_QUOTA_EXCEEDED');
    return reservation;
  }

  private async persistHistory(userId: string, payload: AIRecommendationPayload, data: AnalyzeResponse | CachedAnalysisResult, isPremiumTier: boolean, cached: boolean) {
    const issues = (data.issues ?? []) as AnalyzeIssue[];
    const docsUsed = (data.docs_used ?? []) as AnalyzeKnowledgeDoc[];
    const suggestions = issues.map((issue) => `[${issue.severity}] ${issue.description}`);
    const raceConditions = issues.map((issue) => `${issue.line_range}: ${issue.description}`);
    const optimizedCode = issues[0]?.fix;
    const explanation = buildExplanation(issues.length, docsUsed.length);
    const response = ['### AI Code Analysis', '', ...issues.map((issue, index) => `${index + 1}. [${issue.severity}] ${issue.line_range}: ${issue.description}`), '', explanation].join('\n');
    return this.histories.create(AIHistoryEntity.createNew({
      userId, codeExecutionId: payload.codeExecutionId, inputCode: payload.inputCode, language: payload.language,
      prompt: `Analyze this ${payload.language} snippet for concurrent programming issues.`, response, suggestions,
      raceConditions, optimizedCode: isPremiumTier ? optimizedCode : undefined, explanation,
      modelName: 'threadlearn-ai2-server', category: 'code-analysis',
      issues: issues.map((issue) => ({
        patternId: issue.pattern_id ?? 'unknown',
        lineRange: issue.line_range,
        severity: issue.severity,
        description: issue.description,
        fix: isPremiumTier ? issue.fix : undefined,
      })),
      docsUsed: docsUsed.map((doc) => ({ id: doc.id, title: doc.title, category: doc.category, content: doc.content, score: doc.bm25_score })),
      cached,
    }));
  }

  private withQuota(history: unknown, quota: { limit: number; remaining: number }) {
    const value = history && typeof (history as any).toObject === 'function'
      ? (history as any).toObject()
      : history;
    return { ...(value as Record<string, unknown>), quotaLimit: quota.limit, remainingQuota: quota.remaining };
  }
}
