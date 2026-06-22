import { Inject, Injectable } from '@nestjs/common';
import vm from 'vm';
import { BadRequestError, NotFoundError } from '../../../../common/custom-error';
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
import { CodeSubmitPayload } from '../dto/code-execution.dto';

type ExecutionResult = {
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
const resolveJudge0Mode = (url: string | undefined, key: string | undefined): 'remote' | 'local' => {
  if (!url) return 'local';
  if (url.includes('api.judge0.com')) return 'local';
  if (isRapidApi(url) && !key) return 'local';
  return 'remote';
};

const stringifyArg = (value: unknown): string => {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const callJudge0 = async (
  url: string,
  key: string | undefined,
  payload: { source_code: string; language_id: number; stdin: string },
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
  const response = await fetch(`${url}/submissions?base64_encoded=true&wait=true`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      source_code: Buffer.from(payload.source_code).toString('base64'),
      language_id: payload.language_id,
      stdin: Buffer.from(payload.stdin).toString('base64'),
    }),
  });
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

const runLocalSandbox = async (language: string, sourceCode: string, stdin: string): Promise<ExecutionResult> => {
  if (process.env.NODE_ENV === 'production') {
    return {
      stdout: '',
      stderr: 'Code execution sandbox is disabled in production. Configure JUDGE0_API_URL + JUDGE0_API_KEY to enable real grading.',
      compileOutput: '',
      status: { id: 11, description: 'Sandbox Disabled' },
      time: '0.000',
      memory: 0,
    };
  }
  const lang = language.toLowerCase();
  const start = process.hrtime.bigint();
  if (lang === 'javascript' || lang === 'js') {
    const stdoutChunks: string[] = [];
    const stderrChunks: string[] = [];
    const consoleProxy = {
      log: (...a: unknown[]) => stdoutChunks.push(a.map(stringifyArg).join(' ')),
      info: (...a: unknown[]) => stdoutChunks.push(a.map(stringifyArg).join(' ')),
      warn: (...a: unknown[]) => stderrChunks.push(a.map(stringifyArg).join(' ')),
      error: (...a: unknown[]) => stderrChunks.push(a.map(stringifyArg).join(' ')),
    };
    const inputLines = stdin.split(/\r?\n/);
    let lineIdx = 0;
    const sandbox: Record<string, unknown> = {
      console: consoleProxy,
      readLine: () => (lineIdx < inputLines.length ? inputLines[lineIdx++] : ''),
      readInt: () => parseInt(lineIdx < inputLines.length ? inputLines[lineIdx++] : '0', 10),
      input: stdin,
    };
    try {
      const ctx = vm.createContext(sandbox);
      const script = new vm.Script(sourceCode, { filename: 'student-submission.js' });
      await Promise.race([
        Promise.resolve().then(() => script.runInContext(ctx, { timeout: 3000 })),
        new Promise((_, reject) => setTimeout(() => reject(new Error('time_limit_exceeded')), 5000)),
      ]);
      const elapsedMs = Number(process.hrtime.bigint() - start) / 1_000_000;
      return { stdout: stdoutChunks.join('\n'), stderr: stderrChunks.join('\n'), compileOutput: '', status: { id: 3, description: 'Accepted' }, time: (elapsedMs / 1000).toFixed(3), memory: process.memoryUsage().heapUsed >> 10 };
    } catch (err) {
      const msg = (err as Error).message;
      return { stdout: stdoutChunks.join('\n'), stderr: msg, compileOutput: '', status: msg === 'time_limit_exceeded' ? { id: 5, description: 'Time Limit Exceeded' } : { id: 7, description: 'Runtime Error' }, time: '0.000', memory: 0 };
    }
  }
  return { stdout: '', stderr: `Local sandbox does not run "${language}". Configure JUDGE0_API_KEY to run real code.`, compileOutput: '', status: { id: 11, description: 'Sandbox Unavailable' }, time: '0.000', memory: 0 };
};

@Injectable()
export class CodeExecutionService {
  constructor(
    @Inject(CODE_EXECUTION_REPOSITORY) private readonly executions: ICodeExecutionRepository,
    @Inject(LEARNING_ACCESS) private readonly learningAccess: ILearningAccess,
  ) {}

  static resolveLanguageId(language?: string, languageId?: number) {
    if (languageId) return languageId;
    if (!language) throw new BadRequestError('language or languageId is required.');
    const resolved = LANGUAGE_IDS[language.toLowerCase()];
    if (!resolved) throw new BadRequestError('CODE_LANGUAGE_NOT_SUPPORTED');
    return resolved;
  }

  async executeCode(userId: string, payload: CodeSubmitPayload, userRole: 'STUDENT' | 'ADMIN' = 'STUDENT') {
    const { sourceCode, stdin = '' } = payload;
    if (!sourceCode?.trim()) throw new BadRequestError('sourceCode is required.');
    if (sourceCode.length > 50000) throw new BadRequestError('sourceCode exceeds the 50000 character limit.');
    if (stdin.length > 10000) throw new BadRequestError('stdin exceeds the 10000 character limit.');

    if (!payload.exerciseId) {
      const since = new Date();
      since.setHours(0, 0, 0, 0);
      const usedToday = await this.executions.countFreeRunsToday(userId, since);
      if (usedToday >= 20) throw new BadRequestError('CODE_RUN_LIMIT - you have used your 20 daily code executions.');
    }

    const languageId = CodeExecutionService.resolveLanguageId(payload.language, payload.languageId);
    const language = payload.language ?? String(languageId);
    let courseId = payload.courseId;
    if (payload.lessonId) {
      const lesson = await this.learningAccess.assertLessonViewAccess(payload.lessonId, { id: userId, role: userRole });
      courseId = courseId ?? lesson.courseId.toString();
    }

    let result: ExecutionResult;
    if (resolveJudge0Mode(env.JUDGE0_API_URL, env.JUDGE0_API_KEY) === 'remote') {
      try {
        result = await callJudge0(env.JUDGE0_API_URL, env.JUDGE0_API_KEY, { source_code: sourceCode, language_id: languageId, stdin });
      } catch (err) {
        logger.error('Judge0 remote call failed, falling back to local sandbox.', err);
        result = await runLocalSandbox(language, sourceCode, stdin);
      }
    } else {
      result = await runLocalSandbox(language, sourceCode, stdin);
    }
    return this.persistExecution(userId, payload, language, languageId, courseId, result);
  }

  async listHistory(userId: string, lessonId?: string) {
    return this.executions.listHistory(userId, lessonId);
  }

  async getById(userId: string, id: string) {
    const execution = await this.executions.findByUserAndId(userId, id);
    if (!execution) throw new NotFoundError('Code execution not found.');
    return execution;
  }

  private async persistExecution(userId: string, payload: CodeSubmitPayload, language: string, languageId: number, courseId: string | undefined, result: ExecutionResult) {
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
        stdout: result.stdout ?? '',
        stderr: result.stderr ?? '',
        compileOutput: result.compileOutput ?? '',
        runtime: result.time,
        memory: result.memory,
        judge0Token: result.token,
        exitCode: result.status?.id,
        errorMessage: result.stderr || result.compileOutput || undefined,
      }),
    );
    return { _id: record._id, stdout: record.stdout, stderr: record.stderr, compileOutput: record.compileOutput, status: result.status, runtime: record.runtime, memory: record.memory, language: record.language, languageId: record.languageId, createdAt: record.createdAt };
  }
}
