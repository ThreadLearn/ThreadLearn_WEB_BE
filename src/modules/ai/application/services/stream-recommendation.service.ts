import { Inject, Injectable } from '@nestjs/common';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import type { Response } from 'express';
import { BadRequestError, NotFoundError } from '../../../../common/custom-error';
import { env } from '../../../../configs/env';
import { AIHistoryEntity } from '../../domain/entities/ai-history.entity';
import {
  AI_HISTORY_REPOSITORY,
  IAIHistoryRepository,
} from '../../domain/interfaces/ai-history.repository';
import { AIRecommendationPayload } from '../dto/ai.dto';
import { buildExplanation } from './build-explanation';

const FREE_DAILY_LIMIT = 999;

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

@Injectable()
export class StreamRecommendationService {
  constructor(@Inject(AI_HISTORY_REPOSITORY) private readonly histories: IAIHistoryRepository) {}

  async execute(userId: string, payload: AIRecommendationPayload, res: Response) {
    if (!payload.inputCode) {
      throw new BadRequestError('inputCode is required.');
    }

    const user = await this.histories.findUserProfile(userId);
    if (!user) throw new NotFoundError('User profile not found.');

    await this.assertDailyLimit(userId);

    const aiToken = jwt.sign({ sub: userId }, env.JWT_ACCESS_SECRET, { expiresIn: '5m' });
    const startTime = Date.now();

    const upstream = await axios.post(
      `${env.AI_API_URL}/api/v1/ai/analyze/stream`,
      { code: payload.inputCode, language: payload.language, user_id: userId },
      {
        timeout: env.AI_API_TIMEOUT_MS,
        headers: { Authorization: `Bearer ${aiToken}` },
        responseType: 'stream',
      }
    );

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    let buffer = '';

    let persistPromise: Promise<void> | null = null;
    const persist = async (resultData: AnalyzeResultData) => {
      const issues = resultData.issues ?? [];
      const suggestions = issues.map((issue) => `[${issue.severity}] ${issue.description}`);
      const raceConditions = issues.map((issue) => `${issue.line_range}: ${issue.description}`);
      const optimizedCode = issues[0]?.fix;
      const explanation = buildExplanation(issues.length, (resultData.docs_used ?? []).length);
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
            codeSnippet: issue.code_snippet,
          })),
          docsUsed: (resultData.docs_used ?? []).map((doc) => ({
            id: doc.id,
            title: doc.title,
            category: doc.category,
            content: doc.content,
            score: doc.bm25_score,
          })),
          cached: resultData.cached ?? false,
          analyzeTimeMs: Date.now() - startTime,
        })
      );
    };

    const forwardEvent = (part: string) => {
      const eventMatch = part.match(/^event:\s*(.+)$/m);
      const dataMatch = part.match(/^data:\s*(.+)$/m);
      if (!eventMatch?.[1] || !dataMatch?.[1]) {
        res.write(`${part}\n\n`);
        return;
      }
      const eventName = eventMatch[1].trim();
      try {
        const eventData = JSON.parse(dataMatch[1]) as Record<string, unknown>;
        if (eventName === 'result' && !persistPromise) {
          persistPromise = persist(eventData as unknown as AnalyzeResultData);
        }
        res.write(`event: ${eventName}\ndata: ${JSON.stringify(eventData)}\n\n`);
      } catch {
        res.write(`${part}\n\n`);
      }
    };

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
            // persist failure logged at service level; stream continues
          }
          if (!clientAborted && !res.writableEnded) res.end();
          resolve();
        })();
      });

      upstream.data.on('error', (err: Error) => {
        if (clientAborted) {
          resolve();
          return;
        }
        if (!res.writableEnded) {
          res.write(
            `event: error\ndata: ${JSON.stringify({ message: err.message || 'Upstream stream error' })}\n\n`
          );
          res.end();
        }
        resolve();
      });
    });
  }

  private async assertDailyLimit(userId: string) {
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    const usedToday = await this.histories.countToday(userId, since);
    const limit = FREE_DAILY_LIMIT;
    if (usedToday >= limit) throw new BadRequestError('AI_USAGE_LIMIT_EXCEEDED');
  }
}
