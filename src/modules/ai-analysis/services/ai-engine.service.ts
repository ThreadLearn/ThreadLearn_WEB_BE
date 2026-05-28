import { createHash } from 'crypto';
import { env } from '../../../configs/env';
import { logger } from '../../../configs/logger';
import { getRedisClient } from '../../../configs/redis';

const AI_CACHE_TTL = 3600; // 1 hour
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export interface AIAnalysisResult {
  suggestions: string[];
  raceConditions: string[];
  optimizedCode?: string;
  explanation: string;
  tokensUsed: number;
}

// Lightweight code-context extraction (replaces @babel/parser AST — no extra dep)
function extractCodeContext(code: string, language: string): string {
  const patterns: string[] = [];

  if (/async\s+function|async\s*\(|async\s+\w+\s*=/.test(code)) patterns.push('async functions');
  if (/await\s+/.test(code)) patterns.push('await expressions');
  if (/new\s+Promise|Promise\.(all|race|allSettled)/.test(code)) patterns.push('Promise usage');
  if (/setTimeout|setInterval|clearTimeout|clearInterval/.test(code)) patterns.push('timer functions');
  if (/for\s*\(|while\s*\(|for\s+\w+\s+of|for\s+\w+\s+in/.test(code)) patterns.push('loop constructs');
  if (/\.map\(|\.filter\(|\.reduce\(|\.forEach\(/.test(code)) patterns.push('array iteration');
  if (/global\.|window\.|module\.exports|exports\./.test(code)) patterns.push('global/module state');
  if (/try\s*\{|catch\s*\(/.test(code)) patterns.push('error handling');
  if (/Thread|synchronized|volatile|mutex|semaphore/i.test(code)) patterns.push('concurrency primitives');
  if (/import\s|require\(/.test(code)) patterns.push('module imports');

  const varNames = [...code.matchAll(/(?:let|const|var)\s+(\w+)/g)]
    .map((m) => m[1])
    .slice(0, 12)
    .join(', ');

  const lineCount = code.split('\n').length;

  return [
    `Language: ${language}`,
    `Lines: ${lineCount}`,
    `Detected patterns: ${patterns.length ? patterns.join(', ') : 'none'}`,
    `Declared variables: ${varNames || 'none'}`,
  ].join('\n');
}

const SYSTEM_PROMPT =
  'You are a concurrent programming expert. Analyze the provided code and return JSON with this exact structure: ' +
  '{ "suggestions": string[], "raceConditions": string[], "optimizedCode": string | null, "explanation": string }. ' +
  'Focus on race conditions, shared state issues, async pitfalls, and performance. Return ONLY valid JSON.';

export class AIEngineService {
  static async analyze(inputCode: string, language: string): Promise<AIAnalysisResult> {
    const cacheKey = `ai:cache:${createHash('sha256').update(inputCode + language).digest('hex')}`;

    // Try Redis cache first
    const redis = getRedisClient();
    if (redis.isOpen) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          logger.info('AI analysis served from Redis cache.');
          return JSON.parse(cached);
        }
      } catch (err) {
        logger.warn('Redis cache read failed for AI analysis.', err);
      }
    }

    const result = await AIEngineService.callOpenAI(inputCode, language);

    // Persist in cache
    if (redis.isOpen) {
      try {
        await redis.setEx(cacheKey, AI_CACHE_TTL, JSON.stringify(result));
      } catch (err) {
        logger.warn('Redis cache write failed for AI analysis.', err);
      }
    }

    return result;
  }

  private static async callOpenAI(inputCode: string, language: string): Promise<AIAnalysisResult> {
    if (!env.OPENAI_API_KEY) {
      logger.info('OPENAI_API_KEY not configured — returning mock AI analysis.');
      return {
        suggestions: [
          'Use proper synchronization when accessing shared state across async operations.',
          'Avoid mutating variables defined in an outer scope inside callbacks.',
          'Prefer Promise.all with error boundaries to avoid silent failures.',
        ],
        raceConditions: [],
        optimizedCode: undefined,
        explanation:
          'Mock analysis — configure OPENAI_API_KEY in your environment for real AI-powered code review.',
        tokensUsed: 0,
      };
    }

    const codeContext = extractCodeContext(inputCode, language);
    const userMessage =
      `Code context:\n${codeContext}\n\n` +
      `Code to analyze:\n\`\`\`${language}\n${inputCode}\n\`\`\`\n\n` +
      `Return JSON analysis only.`;

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('OpenAI API error', { status: response.status, body: errorText });
      throw new Error('AI analysis service temporarily unavailable.');
    }

    const data = await response.json();
    const content: string = data.choices?.[0]?.message?.content ?? '';
    const tokensUsed: number = data.usage?.total_tokens ?? 0;

    if (!content) throw new Error('AI analysis returned an empty response.');

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error('AI analysis response could not be parsed as JSON.');
    }

    return {
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      raceConditions: Array.isArray(parsed.raceConditions) ? parsed.raceConditions : [],
      optimizedCode: typeof parsed.optimizedCode === 'string' ? parsed.optimizedCode : undefined,
      explanation: typeof parsed.explanation === 'string' ? parsed.explanation : '',
      tokensUsed,
    };
  }
}

export default AIEngineService;
