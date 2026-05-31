import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { RedisService } from '../../../config/redis.service';

const AI_CACHE_TTL   = 3600;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export interface AIAnalysisResult {
  suggestions:    string[];
  raceConditions: string[];
  optimizedCode?: string;
  explanation:    string;
  tokensUsed:     number;
}

function extractCodeContext(code: string, language: string): string {
  const patterns: string[] = [];
  if (/async\s+function|async\s*\(/.test(code))               patterns.push('async functions');
  if (/await\s+/.test(code))                                   patterns.push('await expressions');
  if (/new\s+Promise|Promise\.(all|race|allSettled)/.test(code)) patterns.push('Promise usage');
  if (/setTimeout|setInterval/.test(code))                     patterns.push('timer functions');
  if (/for\s*\(|while\s*\(/.test(code))                        patterns.push('loop constructs');
  if (/\.map\(|\.filter\(|\.reduce\(/.test(code))              patterns.push('array iteration');
  if (/global\.|window\./.test(code))                          patterns.push('global state');
  if (/try\s*\{|catch\s*\(/.test(code))                        patterns.push('error handling');
  if (/Thread|synchronized|mutex|semaphore/i.test(code))        patterns.push('concurrency primitives');

  const varNames = [...code.matchAll(/(?:let|const|var)\s+(\w+)/g)]
    .map((m) => m[1]).slice(0, 12).join(', ');

  return [
    `Language: ${language}`,
    `Lines: ${code.split('\n').length}`,
    `Detected patterns: ${patterns.length ? patterns.join(', ') : 'none'}`,
    `Declared variables: ${varNames || 'none'}`,
  ].join('\n');
}

const SYSTEM_PROMPT =
  'You are a concurrent programming expert. Analyze the provided code and return JSON: ' +
  '{ "suggestions": string[], "raceConditions": string[], "optimizedCode": string | null, "explanation": string }. ' +
  'Focus on race conditions, shared state issues, async pitfalls, and performance. Return ONLY valid JSON.';

@Injectable()
export class AIEngineService {
  private readonly logger = new Logger(AIEngineService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly config: ConfigService,
  ) {}

  async analyze(inputCode: string, language: string): Promise<AIAnalysisResult> {
    const cacheKey = `ai:cache:${createHash('sha256').update(inputCode + language).digest('hex')}`;

    if (this.redisService.isOpen) {
      try {
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
          this.logger.debug('AI analysis served from cache.');
          return JSON.parse(cached);
        }
      } catch { /* cache miss — proceed */ }
    }

    const result = await this.callOpenAI(inputCode, language);

    if (this.redisService.isOpen) {
      try { await this.redisService.setEx(cacheKey, AI_CACHE_TTL, JSON.stringify(result)); } catch {}
    }
    return result;
  }

  private async callOpenAI(inputCode: string, language: string): Promise<AIAnalysisResult> {
    const apiKey = this.config.get<string>('openai.apiKey');

    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY not set — returning mock analysis.');
      return {
        suggestions:    ['Use proper synchronization when accessing shared state.', 'Avoid mutating outer-scope variables in callbacks.'],
        raceConditions: [],
        explanation:    'Mock analysis — configure OPENAI_API_KEY for real AI review.',
        tokensUsed:     0,
      };
    }

    const context = extractCodeContext(inputCode, language);
    const userMsg = `Code context:\n${context}\n\nCode to analyze:\n\`\`\`${language}\n${inputCode}\n\`\`\`\n\nReturn JSON analysis only.`;

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model:           'gpt-4o-mini',
        messages:        [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: userMsg }],
        max_tokens:      1500,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) throw new Error('AI analysis service temporarily unavailable.');

    const data    = await response.json();
    const content = data.choices?.[0]?.message?.content ?? '';
    if (!content) throw new Error('AI returned empty response.');

    const parsed = JSON.parse(content);
    return {
      suggestions:    Array.isArray(parsed.suggestions)    ? parsed.suggestions    : [],
      raceConditions: Array.isArray(parsed.raceConditions) ? parsed.raceConditions : [],
      optimizedCode:  typeof parsed.optimizedCode === 'string' ? parsed.optimizedCode : undefined,
      explanation:    typeof parsed.explanation   === 'string' ? parsed.explanation   : '',
      tokensUsed:     data.usage?.total_tokens ?? 0,
    };
  }
}
