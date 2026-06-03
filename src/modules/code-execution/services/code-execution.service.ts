import vm from 'vm';
import { env } from '../../../configs/env';
import { logger } from '../../../configs/logger';
import { BadRequestError, NotFoundError } from '../../../common/custom-error';
import { LessonsService } from '../../lessons/services/lessons.service';
import { CodeExecution } from '../models/code-execution.model';

type ExecutionResult = {
  stdout: string;
  stderr: string;
  compileOutput: string;
  status: { id: number; description: string };
  time: string;
  memory: number;
  token?: string;
};

const isRapidApi = (url: string) => /rapidapi\.com/i.test(url);

const resolveJudge0Mode = (url: string | undefined, key: string | undefined): 'remote' | 'local' => {
  if (!url) return 'local';
  if (url.includes('api.judge0.com')) return 'local'; // public sandbox endpoint, often blocked
  if (isRapidApi(url) && !key) return 'local';        // RapidAPI requires a key
  return 'remote';
};

const callJudge0 = async (
  url: string,
  key: string | undefined,
  payload: { source_code: string; language_id: number; stdin: string }
): Promise<ExecutionResult> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (isRapidApi(url)) {
    if (!key) throw new Error('RapidAPI Judge0 requires JUDGE0_API_KEY.');
    const host = new URL(url).host;
    headers['X-RapidAPI-Key'] = key;
    headers['X-RapidAPI-Host'] = host;
  } else if (key) {
    // Self-hosted Judge0 uses its own auth token header.
    headers['X-Auth-Token'] = key;
  }

  logger.info(`Judge0 → ${url} (lang ${payload.language_id}, stdin ${payload.stdin.length}B)`);
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

/**
 * Local fallback so demo+grading still works without a Judge0 key.
 * Executes JavaScript safely in a vm.Script sandbox. Other languages get a stub
 * stdout warning instead of failing silently.
 */
const runLocalSandbox = async (
  language: string,
  sourceCode: string,
  stdin: string
): Promise<ExecutionResult> => {
  // SECURITY (P0): Node's `vm` module is NOT a real security boundary. A
  // determined attacker can break out and call `process`, `require`, etc.
  // We tolerate the local sandbox only outside production so dev/demo grading
  // works without a Judge0 key. In production, refuse and force the operator
  // to configure a real Judge0 endpoint.
  if (process.env.NODE_ENV === 'production') {
    return {
      stdout: '',
      stderr:
        'Code execution sandbox is disabled in production. Configure JUDGE0_API_URL + JUDGE0_API_KEY to enable real grading.',
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
      log:  (...a: unknown[]) => stdoutChunks.push(a.map(stringifyArg).join(' ')),
      info: (...a: unknown[]) => stdoutChunks.push(a.map(stringifyArg).join(' ')),
      warn: (...a: unknown[]) => stderrChunks.push(a.map(stringifyArg).join(' ')),
      error:(...a: unknown[]) => stderrChunks.push(a.map(stringifyArg).join(' ')),
    };
    const inputLines = stdin.split(/\r?\n/);
    let lineIdx = 0;
    const sandbox: Record<string, unknown> = {
      console: consoleProxy,
      readLine: () => (lineIdx < inputLines.length ? inputLines[lineIdx++] : ''),
      readInt:  () => parseInt(lineIdx < inputLines.length ? inputLines[lineIdx++] : '0', 10),
      input:    stdin,
    };
    try {
      const ctx = vm.createContext(sandbox);
      const script = new vm.Script(sourceCode, { filename: 'student-submission.js' });
      await Promise.race([
        Promise.resolve().then(() => script.runInContext(ctx, { timeout: 3000 })),
        new Promise((_, reject) => setTimeout(() => reject(new Error('time_limit_exceeded')), 5000)),
      ]);
      const elapsedMs = Number(process.hrtime.bigint() - start) / 1_000_000;
      return {
        stdout: stdoutChunks.join('\n'),
        stderr: stderrChunks.join('\n'),
        compileOutput: '',
        status: { id: 3, description: 'Accepted' },
        time: (elapsedMs / 1000).toFixed(3),
        memory: process.memoryUsage().heapUsed >> 10,
      };
    } catch (err) {
      const msg = (err as Error).message;
      return {
        stdout: stdoutChunks.join('\n'),
        stderr: msg,
        compileOutput: '',
        status:
          msg === 'time_limit_exceeded'
            ? { id: 5, description: 'Time Limit Exceeded' }
            : { id: 7, description: 'Runtime Error' },
        time: '0.000',
        memory: 0,
      };
    }
  }

  // Unsupported language without remote Judge0 — emit clear notice instead of garbage.
  return {
    stdout: '',
    stderr: `Local sandbox does not run "${language}". Configure JUDGE0_API_KEY to run real code.`,
    compileOutput: '',
    status: { id: 11, description: 'Sandbox Unavailable' },
    time: '0.000',
    memory: 0,
  };
};

const stringifyArg = (value: unknown): string => {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

export interface CodeSubmitPayload {
  sourceCode: string;
  languageId?: number;
  language?: string;
  stdin?: string;
  courseId?: string;
  lessonId?: string;
  exerciseId?: string;
}

const LANGUAGE_IDS: Record<string, number> = {
  javascript: 63,
  js: 63,
  python: 71,
  py: 71,
  java: 62,
  cpp: 54,
  c: 50,
};

export class CodeExecutionService {
  static resolveLanguageId(language?: string, languageId?: number) {
    if (languageId) return languageId;
    if (!language) throw new BadRequestError('language or languageId is required.');
    const resolved = LANGUAGE_IDS[language.toLowerCase()];
    if (!resolved) throw new BadRequestError('CODE_LANGUAGE_NOT_SUPPORTED');
    return resolved;
  }

  static async executeCode(userId: string, payload: CodeSubmitPayload) {
    const { sourceCode, stdin = '' } = payload;
    if (!sourceCode?.trim()) throw new BadRequestError('sourceCode is required.');
    if (sourceCode.length > 50000) {
      throw new BadRequestError('sourceCode exceeds the 50000 character limit.');
    }
    if (stdin.length > 10000) throw new BadRequestError('stdin exceeds the 10000 character limit.');

    // BR (UC44): rate limit 20 free-form executions / day / user. Exercise
    // grading bypasses this check by going through `ExercisesService.grade`,
    // which invokes `executeCode` once per test case; we exempt that by
    // tagging the payload with an `exerciseId`.
    if (!payload.exerciseId) {
      const since = new Date();
      since.setHours(0, 0, 0, 0);
      const usedToday = await CodeExecution.countDocuments({
        userId,
        createdAt: { $gte: since },
        exerciseId: { $in: [null, undefined] },
      });
      if (usedToday >= 20) {
        throw new BadRequestError('CODE_RUN_LIMIT — you have used your 20 daily code executions.');
      }
    }

    const languageId = this.resolveLanguageId(payload.language, payload.languageId);
    const language = payload.language ?? String(languageId);
    let courseId = payload.courseId;

    if (payload.lessonId) {
      const lesson = await LessonsService.assertLessonAccess(payload.lessonId, {
        id: userId,
        role: 'STUDENT',
      });
      courseId = courseId ?? lesson.courseId.toString();
    }

    const judge0Mode = resolveJudge0Mode(env.JUDGE0_API_URL, env.JUDGE0_API_KEY);
    if (judge0Mode === 'remote') {
      try {
        const result = await callJudge0(env.JUDGE0_API_URL, env.JUDGE0_API_KEY, {
          source_code: sourceCode,
          language_id: languageId,
          stdin,
        });
        return this.persistExecution(userId, payload, language, languageId, courseId, result);
      } catch (err) {
        logger.error('Judge0 remote call failed, falling back to local sandbox.', err);
      }
    }

    const local = await runLocalSandbox(language, sourceCode, stdin);
    return this.persistExecution(userId, payload, language, languageId, courseId, local);
  }

  static async listHistory(userId: string, lessonId?: string) {
    return CodeExecution.find({
      userId,
      ...(lessonId ? { lessonId } : {}),
    })
      .sort({ createdAt: -1 })
      .limit(50);
  }

  static async getById(userId: string, id: string) {
    const execution = await CodeExecution.findOne({ _id: id, userId });
    if (!execution) throw new NotFoundError('Code execution not found.');
    return execution;
  }

  private static async persistExecution(
    userId: string,
    payload: CodeSubmitPayload,
    language: string,
    languageId: number,
    courseId: string | undefined,
    result: any
  ) {
    const record = await CodeExecution.create({
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
      executedAt: new Date(),
    });

    return {
      _id: record._id,
      stdout: record.stdout,
      stderr: record.stderr,
      compileOutput: record.compileOutput,
      status: result.status,
      runtime: record.runtime,
      memory: record.memory,
      language: record.language,
      languageId: record.languageId,
      createdAt: record.createdAt,
    };
  }
}

export default CodeExecutionService;
