import { Inject, Injectable } from '@nestjs/common';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import type { Response } from 'express';
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
  code_snippet?: string;
}

interface AnalyzeKnowledgeDoc {
  id: string;
  title: string;
  category?: string;
  content?: string;
  bm25_score?: number;
}

interface AnalyzeResultData {
  issues: AnalyzeIssue[];
  docs_used: AnalyzeKnowledgeDoc[];
  cached: boolean;
}

/**
 * Proxies the AI server's SSE pipeline (race_detector -> ast -> bm25 -> prompt -> llm)
 * straight through to the client so the FE can render step-by-step progress instead
 * of a blind spinner, then persists history once the "result" event arrives.
 */
@Injectable()
export class StreamRecommendationService {
  constructor(
    @Inject(AI_HISTORY_REPOSITORY) private readonly histories: IAIHistoryRepository,
    private readonly quotas: DailyQuotaService,
    private readonly cache: AIAnalysisCacheService,
  ) {}

  async execute(userId: string, payload: AIRecommendationPayload, res: Response) {
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
    if (cached) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders();
      await this.persistHistory(userId, payload, cached, isPremiumTier, true, 0);
      const presented = presentAnalysisForTier({ ...cached, cached: true }, isPremiumTier);
      res.write(`event: result\ndata: ${JSON.stringify(presented)}\n\n`);
      res.end();
      return;
    }

    const reservation = await this.reserveQuota(userId, limit);

    const aiToken = jwt.sign({ sub: userId }, env.JWT_ACCESS_SECRET, { expiresIn: '5m' });
    const startTime = Date.now();
    let upstream: { data: any };
    try {
      upstream = await axios.post(
        `${env.AI_API_URL}/api/v1/ai/analyze/stream`,
        { code: payload.inputCode, language: payload.language, user_id: userId },
        { timeout: env.AI_API_TIMEOUT_MS, headers: { Authorization: `Bearer ${aiToken}` }, responseType: 'stream' },
      );
    } catch (error) {
      await this.quotas.release(reservation);
      throw error;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    let buffer = '';

    let analysisCompleted = false;
    let quotaReleased = false;
    let persistPromise: Promise<void> | null = null;
    const persist = async (resultData: AnalyzeResultData) => {
      await this.cache.set(cacheKey, { issues: resultData.issues ?? [], docs_used: resultData.docs_used ?? [] });
      await this.persistHistory(userId, payload, resultData, isPremiumTier, false, Date.now() - startTime);
      analysisCompleted = true;
    };
    const releaseIfIncomplete = async () => {
      if (!analysisCompleted && !quotaReleased) {
        quotaReleased = true;
        await this.quotas.release(reservation);
      }
    };
    const forwardEvent = (part: string) => {
      const eventMatch = part.match(/^event:\s*(.+)$/m);
      const dataMatch = part.match(/^data:\s*(.+)$/m);
      if (!eventMatch?.[1] || !dataMatch?.[1]) {
        if (isPremiumTier) res.write(`${part}\n\n`);
        return;
      }
      const eventName = eventMatch[1].trim();
      try {
        const eventData = JSON.parse(dataMatch[1]) as Record<string, unknown>;
        if (eventName === 'result' && !persistPromise) {
          persistPromise = persist(eventData as unknown as AnalyzeResultData);
        }
        res.write(
          `event: ${eventName}\ndata: ${JSON.stringify(
            presentAnalysisForTier(eventData, isPremiumTier),
          )}\n\n`,
        );
      } catch {
        if (isPremiumTier) res.write(`${part}\n\n`);
      }
    };

    // Client (browser) can abort mid-stream (tab close, reload) — that's normal,
    // not a server error. Stop forwarding chunks and tear down the upstream request
    // without throwing, so it never reaches GlobalExceptionFilter on a closed response.
    let clientAborted = false;
    res.on('close', () => {
      if (!res.writableEnded) {
        clientAborted = true;
        upstream.data.destroy();
      }
    });

    await new Promise<void>((resolve) => {
      upstream.data.on('data', (chunk: Buffer) => {
        if (clientAborted) return;
        const text = chunk.toString('utf-8');
        buffer += text;

        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';
        for (const part of parts) forwardEvent(part);
      });

      upstream.data.on('end', () => {
        void (async () => {
          if (buffer.trim() && !clientAborted) forwardEvent(buffer);
          try {
            if (persistPromise) await persistPromise;
          } catch {
            analysisCompleted = false;
          }
          if (!analysisCompleted) {
            await releaseIfIncomplete();
            if (!clientAborted && !res.writableEnded) {
              res.write(`event: error\ndata: ${JSON.stringify({ message: 'AI analysis ended without a result.' })}\n\n`);
            }
          }
          if (!clientAborted && !res.writableEnded) res.end();
          resolve();
        })();
      });

      upstream.data.on('error', (err: Error) => {
        if (clientAborted) {
          void releaseIfIncomplete().finally(resolve);
          return;
        }
        // Headers/body may already be partially flushed to the client at this point
        // (SSE stream mid-flight) — never reject here, since a reject propagates to
        // GlobalExceptionFilter which would try res.status().json() on a response
        // that has already started writing, crashing with ERR_HTTP_HEADERS_SENT.
        // Instead, tell the client via a proper SSE error event and end cleanly.
        if (!res.writableEnded) {
          res.write(`event: error\ndata: ${JSON.stringify({ message: err.message || 'Upstream stream error' })}\n\n`);
          res.end();
        }
        void releaseIfIncomplete().finally(resolve);
      });
    });
  }

  private async reserveQuota(userId: string, limit: number): Promise<DailyQuotaReservation> {
    const reservation = await this.quotas.reserve(userId, 'ai-recommendation', limit);
    if (!reservation) throw new TooManyRequestsError('Daily AI analysis quota exceeded.', 'AI_QUOTA_EXCEEDED');
    return reservation;
  }

  private async persistHistory(
    userId: string,
    payload: AIRecommendationPayload,
    resultData: AnalyzeResultData | CachedAnalysisResult,
    isPremiumTier: boolean,
    cached: boolean,
    analyzeTimeMs: number,
  ) {
    const issues = (resultData.issues ?? []) as AnalyzeIssue[];
    const docsUsed = (resultData.docs_used ?? []) as AnalyzeKnowledgeDoc[];
    const suggestions = issues.map((issue) => `[${issue.severity}] ${issue.description}`);
    const raceConditions = issues.map((issue) => `${issue.line_range}: ${issue.description}`);
    const explanation = buildExplanation(issues.length, docsUsed.length);
    const response = ['### AI Code Analysis', '', ...issues.map((issue, index) => `${index + 1}. [${issue.severity}] ${issue.line_range}: ${issue.description}`), '', explanation].join('\n');
    return this.histories.create(AIHistoryEntity.createNew({
      userId, codeExecutionId: payload.codeExecutionId, inputCode: payload.inputCode, language: payload.language,
      prompt: `Analyze this ${payload.language} snippet for concurrent programming issues.`, response, suggestions,
      raceConditions, optimizedCode: issues[0]?.fix, explanation,
      modelName: 'threadlearn-ai2-server', category: 'code-analysis',
      issues: issues.map((issue) => ({
        patternId: issue.pattern_id ?? 'unknown',
        lineRange: issue.line_range,
        severity: issue.severity,
        description: issue.description,
        fix: issue.fix,
        codeSnippet: issue.code_snippet,
      })),
      docsUsed: docsUsed.map((doc) => ({ id: doc.id, title: doc.title, category: doc.category, content: doc.content, score: doc.bm25_score })),
      cached, analyzeTimeMs,
    }));
  }
}
