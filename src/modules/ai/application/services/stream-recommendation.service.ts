import { Inject, Injectable } from '@nestjs/common';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import type { Response } from 'express';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../../common/custom-error';
import { env } from '../../../../configs/env';
import { AIHistoryEntity } from '../../domain/entities/ai-history.entity';
import { AI_HISTORY_REPOSITORY, IAIHistoryRepository } from '../../domain/interfaces/ai-history.repository';
import { AIRecommendationPayload } from '../dto/ai.dto';

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
  ) {}

  async execute(userId: string, payload: AIRecommendationPayload, res: Response) {
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

    const upstream = await axios.post(
      `${env.AI_API_URL}/api/v1/ai/analyze/stream`,
      { code: payload.inputCode, language: payload.language, user_id: userId },
      {
        timeout: env.AI_API_TIMEOUT_MS,
        headers: { Authorization: `Bearer ${aiToken}` },
        responseType: 'stream',
      },
    );

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    let buffer = '';

    const persist = async (resultData: AnalyzeResultData) => {
      const issues = resultData.issues ?? [];
      const suggestions = issues.map((issue) => `[${issue.severity}] ${issue.description}`);
      const raceConditions = issues.map((issue) => `${issue.line_range}: ${issue.description}`);
      const optimizedCode = issues[0]?.fix;
      const explanation = issues.length
        ? `Found ${issues.length} concurrency issue(s) in the submitted ${payload.language} code.`
        : 'No concurrency issues detected.';
      const response = [
        '### AI Code Analysis',
        '',
        ...issues.map((issue, index) => `${index + 1}. [${issue.severity}] ${issue.line_range}: ${issue.description}`),
        '',
        explanation,
      ].join('\n');

      await this.histories.create(
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
          docsUsed: (resultData.docs_used ?? []).map((doc) => ({
            id: doc.id,
            title: doc.title,
            category: doc.category,
            content: doc.content,
            score: doc.bm25_score,
          })),
          cached: resultData.cached ?? false,
        }),
      );
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

    await new Promise<void>((resolve, reject) => {
      upstream.data.on('data', (chunk: Buffer) => {
        if (clientAborted) return;
        const text = chunk.toString('utf-8');
        buffer += text;
        res.write(text);

        // Detect the "result" SSE event to persist history without waiting for stream end.
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';
        for (const part of parts) {
          const eventMatch = part.match(/^event:\s*(.+)$/m);
          const dataMatch = part.match(/^data:\s*(.+)$/m);
          if (eventMatch?.[1]?.trim() === 'result' && dataMatch?.[1]) {
            try {
              const resultData = JSON.parse(dataMatch[1]) as AnalyzeResultData;
              persist(resultData).catch(() => undefined);
            } catch {
              // Ignore malformed SSE payloads — stream continues regardless.
            }
          }
        }
      });

      upstream.data.on('end', () => {
        if (!clientAborted) res.end();
        resolve();
      });

      upstream.data.on('error', (err: Error) => {
        if (clientAborted) {
          resolve();
          return;
        }
        if (!res.writableEnded) res.end();
        reject(err);
      });
    });
  }

  private async assertDailyLimit(userId: string, isPremium: boolean) {
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    const usedToday = await this.histories.countToday(userId, since);
    const limit = isPremium ? PREMIUM_DAILY_LIMIT : FREE_DAILY_LIMIT;
    if (usedToday >= limit) throw new ForbiddenError('AI_USAGE_LIMIT_EXCEEDED');
  }
}
