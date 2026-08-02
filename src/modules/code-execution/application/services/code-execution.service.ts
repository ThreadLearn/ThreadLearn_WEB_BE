import { Inject, Injectable } from '@nestjs/common';
import { BadRequestError, NotFoundError, ServiceUnavailableError, TooManyRequestsError } from '../../../../common/custom-error';
import { env } from '../../../../configs/env';
import { logger } from '../../../../configs/logger';
import {
  ILearningAccess,
  LEARNING_ACCESS,
} from '../../../../shared/domain/interfaces/learning-access.port';
import { CodeExecutionEntity } from '../../domain/entities/code-execution.entity';
import {
  CODE_EXECUTION_REPOSITORY,
  ICodeExecutionRepository,
} from '../../domain/interfaces/code-execution.repository';
import { CodeSubmitPayload, MAX_SOURCE_CODE_BYTES } from '../dto/code-execution.dto';
import { DailyQuotaReservation, DailyQuotaService } from '../../../../shared/infrastructure/quota/daily-quota.service';

export type ExecutionResult = {
  stdout: string;
  stderr: string;
  compileOutput: string;
  status: { id: number; description: string };
  time: string;
  memory: number;
  token?: string;
};

const LANGUAGE_IDS: Record<string, number> = { javascript: 63, js: 63, python: 71, py: 71, java: 62, cpp: 54, c: 50 };
const isRapidApi = (url: string) => /rapidapi\.com/i.test(url);
const isJudge0Configured = (url: string | undefined, key: string | undefined) => Boolean(url && key);
const MAX_OUTPUT_BYTES = 64_000;

const truncateUtf8 = (value: string, maxBytes = MAX_OUTPUT_BYTES) => {
  const bytes = Buffer.from(value ?? '', 'utf8');
  if (bytes.length <= maxBytes) return { value: value ?? '', truncated: false };
  return {
    value: bytes.subarray(0, maxBytes).toString('utf8').replace(/\uFFFD$/, ''),
    truncated: true,
  };
};

const callJudge0 = async (
  url: string,
  key: string | undefined,
  payload: { source_code: string; language_id: number; stdin: string; timeLimitMs?: number; memoryLimitKb?: number },
): Promise<ExecutionResult> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (isRapidApi(url)) {
    if (!key) throw new Error('RapidAPI Judge0 requires JUDGE0_API_KEY.');
    headers['X-RapidAPI-Key'] = key;
    headers['X-RapidAPI-Host'] = new URL(url).host;
  } else if (key) {
    headers['X-Auth-Token'] = key;
  }
  logger.info(`Judge0 -> ${url} (lang ${payload.language_id}, stdin ${payload.stdin.length}B)`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.JUDGE0_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${url}/submissions?base64_encoded=true&wait=true`, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        source_code: Buffer.from(payload.source_code).toString('base64'),
        language_id: payload.language_id,
        stdin: Buffer.from(payload.stdin).toString('base64'),
        ...(payload.timeLimitMs ? {
          cpu_time_limit: Math.max(0.1, payload.timeLimitMs / 1000),
          wall_time_limit: Math.max(1, payload.timeLimitMs / 1000 + 1),
        } : {}),
        ...(payload.memoryLimitKb ? { memory_limit: payload.memoryLimitKb } : {}),
      }),
    });
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Judge0 HTTP ${response.status}: ${body.slice(0, 200)}`);
  }
  const raw = await response.json();
  const decode = (s?: string) => (s ? Buffer.from(s, 'base64').toString('utf8') : '');
  return {
    stdout: decode(raw.stdout),
    stderr: decode(raw.stderr),
    compileOutput: decode(raw.compile_output),
    status: raw.status || { id: 3, description: 'Accepted' },
    time: raw.time ?? '0.000',
    memory: raw.memory ?? 0,
    token: raw.token,
  };
};

@Injectable()
export class CodeExecutionService {
  constructor(
    @Inject(CODE_EXECUTION_REPOSITORY) private readonly executions: ICodeExecutionRepository,
    @Inject(LEARNING_ACCESS) private readonly learningAccess: ILearningAccess,
    private readonly quotas: DailyQuotaService,
  ) {}

  static resolveLanguageId(language?: string, languageId?: number) {
    if (languageId) return languageId;
    if (!language) throw new BadRequestError('language or languageId is required.');
    const resolved = LANGUAGE_IDS[language.toLowerCase()];
    if (!resolved) throw new BadRequestError('CODE_LANGUAGE_NOT_SUPPORTED');
    return resolved;
  }

  /**
   * Executes an assignment case without persisting it to the learner-visible
   * playground history.  Keeping hidden inputs out of CodeExecution is a
   * deliberate security boundary; callers are responsible for authorization.
   */
  async executeAssignmentCase(payload: Required<Pick<CodeSubmitPayload, 'sourceCode' | 'language' | 'stdin'>> & {
    timeLimitMs?: number;
    memoryLimitKb?: number;
  }): Promise<ExecutionResult> {
    if (!payload.sourceCode?.trim()) throw new BadRequestError('sourceCode is required.');
    if (Buffer.byteLength(payload.sourceCode, 'utf8') > MAX_SOURCE_CODE_BYTES) {
      throw new BadRequestError(`sourceCode exceeds the ${MAX_SOURCE_CODE_BYTES} byte limit.`);
    }
    if (payload.stdin.length > 10000) throw new BadRequestError('stdin exceeds the 10000 character limit.');
    if (!isJudge0Configured(env.JUDGE0_API_URL, env.JUDGE0_API_KEY)) {
      throw new ServiceUnavailableError('Code execution is temporarily unavailable. Configure Judge0 before running code.', 'JUDGE0_NOT_CONFIGURED');
    }

    const languageId = CodeExecutionService.resolveLanguageId(payload.language);
    try {
      return await callJudge0(env.JUDGE0_API_URL, env.JUDGE0_API_KEY, {
        source_code: payload.sourceCode,
        language_id: languageId,
        stdin: payload.stdin,
        timeLimitMs: payload.timeLimitMs,
        memoryLimitKb: payload.memoryLimitKb,
      });
    } catch (error) {
      if (error instanceof ServiceUnavailableError) throw error;
      logger.error('Judge0 assignment execution failed.', error);
      throw new ServiceUnavailableError('Code execution service is temporarily unavailable.', 'JUDGE0_UNAVAILABLE');
    }
  }

  async executeCode(userId: string, payload: CodeSubmitPayload, userRole: 'STUDENT' | 'ADMIN' = 'STUDENT') {
    const { sourceCode, stdin = '' } = payload;
    if (!sourceCode?.trim()) throw new BadRequestError('sourceCode is required.');
    if (Buffer.byteLength(sourceCode, 'utf8') > MAX_SOURCE_CODE_BYTES) {
      throw new BadRequestError(`sourceCode exceeds the ${MAX_SOURCE_CODE_BYTES} byte limit.`);
    }
    if (stdin.length > 10000) throw new BadRequestError('stdin exceeds the 10000 character limit.');

    const languageId = CodeExecutionService.resolveLanguageId(payload.language, payload.languageId);
    const language = payload.language ?? String(languageId);
    let courseId = payload.courseId;
    if (payload.lessonId) {
      const lesson = await this.learningAccess.assertLessonViewAccess(payload.lessonId, { id: userId, role: userRole });
      // A lesson is the authoritative context. Never persist a caller-provided
      // course id that disagrees with it, otherwise a run could later be
      // attached to an unrelated course discussion.
      courseId = lesson.courseId.toString();
    }

    let reservation: DailyQuotaReservation | null = null;
    if (!payload.exerciseId && userRole !== 'ADMIN') {
      reservation = await this.quotas.reserve(userId, 'code-execution', 20);
      if (!reservation) throw new TooManyRequestsError('You have used your 20 daily code executions.', 'CODE_RUN_LIMIT');
    }

    let result: ExecutionResult;
    try {
      if (!isJudge0Configured(env.JUDGE0_API_URL, env.JUDGE0_API_KEY)) {
        throw new ServiceUnavailableError('Code execution is temporarily unavailable. Configure Judge0 before running code.', 'JUDGE0_NOT_CONFIGURED');
      }
      result = await callJudge0(env.JUDGE0_API_URL, env.JUDGE0_API_KEY, {
        source_code: sourceCode,
        language_id: languageId,
        stdin,
        timeLimitMs: payload.timeLimitMs,
        memoryLimitKb: payload.memoryLimitKb,
      });
    } catch (error) {
      // A failed infrastructure call is not a completed execution, so return
      // the atomically reserved slot. Judge0 status failures are persisted.
      if (reservation) await this.quotas.release(reservation);
      if (error instanceof ServiceUnavailableError) throw error;
      logger.error('Judge0 remote call failed.', error);
      throw new ServiceUnavailableError('Code execution service is temporarily unavailable.', 'JUDGE0_UNAVAILABLE');
    }

    try {
      return await this.persistExecution(userId, payload, language, languageId, courseId, result);
    } catch (error) {
      if (reservation) await this.quotas.release(reservation);
      throw error;
    }
  }

  async listHistory(userId: string, lessonId?: string, exerciseId?: string, page = 1, limit = 20) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const result = await this.executions.listHistory(userId, { lessonId, exerciseId, page: safePage, limit: safeLimit });
    const totalPages = Math.max(1, Math.ceil(result.total / safeLimit));
    return {
      items: result.items.map((execution) => this.presentExecution(execution)),
      meta: {
        page: safePage,
        limit: safeLimit,
        total: result.total,
        totalPages,
        hasMore: safePage < totalPages,
      },
    };
  }

  async getById(userId: string, id: string) {
    const execution = await this.executions.findByUserAndId(userId, id);
    if (!execution) throw new NotFoundError('Code execution not found.');
    return this.presentExecution(execution);
  }

  private presentExecution(execution: any) {
    return {
      _id: String(execution._id ?? execution.id),
      sourceCode: execution.sourceCode,
      language: execution.language,
      languageId: execution.languageId,
      stdin: execution.stdin,
      status: { id: execution.exitCode ?? 0, description: execution.status },
      stdout: execution.stdout ?? '',
      stderr: execution.stderr ?? '',
      compileOutput: execution.compileOutput ?? '',
      outputTruncated: Boolean(execution.outputTruncated),
      runtime: execution.runtime ?? '0.000',
      memory: execution.memory ?? 0,
      createdAt: execution.createdAt,
      executedAt: execution.executedAt,
    };
  }

  private async persistExecution(userId: string, payload: CodeSubmitPayload, language: string, languageId: number, courseId: string | undefined, result: ExecutionResult) {
    const stdout = truncateUtf8(result.stdout ?? '');
    const stderr = truncateUtf8(result.stderr ?? '');
    const compileOutput = truncateUtf8(result.compileOutput ?? '');
    const outputTruncated = stdout.truncated || stderr.truncated || compileOutput.truncated;
    const record: any = await this.executions.create(
      CodeExecutionEntity.createNew({
        userId,
        courseId,
        lessonId: payload.lessonId,
        exerciseId: payload.exerciseId,
        sourceCode: payload.sourceCode,
        language,
        languageId,
        stdin: payload.stdin,
        status: result.status?.description ?? 'Unknown',
        stdout: stdout.value,
        stderr: stderr.value,
        compileOutput: compileOutput.value,
        outputTruncated,
        runtime: result.time,
        memory: result.memory,
        exitCode: result.status?.id,
        errorMessage: result.stderr || result.compileOutput || undefined,
      }),
    );
    return { _id: record._id, stdout: record.stdout, stderr: record.stderr, compileOutput: record.compileOutput, outputTruncated: record.outputTruncated, status: result.status, runtime: record.runtime, memory: record.memory, language: record.language, languageId: record.languageId, createdAt: record.createdAt };
  }
}
