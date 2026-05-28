import { env } from '../../../configs/env';
import { logger } from '../../../configs/logger';
import { getRedisClient } from '../../../configs/redis';
import { Exercise } from '../models/exercise.model';
import { CodeExecution } from '../models/code-execution.model';
import { BadRequestError, NotFoundError } from '../../../common/custom-error';
import { TooManyRequestsError } from '../../../middlewares/rate-limit.middleware';
import { Judge0Service, Judge0Language } from './judge0.service';
import mongoose from 'mongoose';

// Legacy raw-execution payload — kept for admin/execute endpoint
export interface CodeSubmitPayload {
  sourceCode: string;
  languageId: number;
  stdin?: string;
}

const CODE_RUN_LIMIT = 20; // per day
const codeRunStore = new Map<string, { count: number; resetTime: number }>();

function todayKey(userId: string): string {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return `exec:${userId}:${date}`;
}

export class CodeExecutionService {
  // Kept intact — used by existing admin/execute endpoint
  static async executeCode(payload: CodeSubmitPayload) {
    const { sourceCode, languageId, stdin = '' } = payload;

    if (!env.JUDGE0_RAPIDAPI_KEY) {
      logger.info('Judge0 mock mode active — JUDGE0_RAPIDAPI_KEY not set.');
      const simpleOutput =
        sourceCode.includes('print') || sourceCode.includes('console.log')
          ? `Hello, ThreadLearn! (Mock execution on language ID: ${languageId})`
          : 'Process finished with exit code 0';
      return {
        stdout: simpleOutput,
        stderr: '',
        status: 'ACCEPTED',
        statusId: 3,
        time: '0.045',
        memory: 1240,
        compileOutput: null,
      };
    }

    try {
      logger.info(`Connecting to Judge0: ${env.JUDGE0_API_URL}`);
      const response = await fetch(
        `${env.JUDGE0_API_URL}/submissions?base64_encoded=false&wait=true`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-RapidAPI-Key': env.JUDGE0_RAPIDAPI_KEY,
            'X-RapidAPI-Host': env.JUDGE0_RAPIDAPI_HOST,
          },
          body: JSON.stringify({
            source_code: sourceCode,
            language_id: languageId,
            stdin,
          }),
        }
      );
      const raw = await response.json();
      const statusId: number = raw.status?.id ?? 13;
      return {
        stdout: raw.stdout ?? '',
        stderr: raw.stderr ?? '',
        status: raw.status?.description ?? 'ERROR',
        statusId,
        time: raw.time ?? '0',
        memory: raw.memory ?? 0,
        compileOutput: statusId === 6 ? (raw.compile_output ?? null) : null,
      };
    } catch (err) {
      logger.error('Judge0 submission failed.', err);
      return {
        stdout: '',
        stderr: 'Execution service unavailable.',
        status: 'ERROR',
        statusId: 13,
        time: '0',
        memory: 0,
        compileOutput: null,
      };
    }
  }

  static async getExerciseByLesson(lessonId: string) {
    if (!mongoose.isValidObjectId(lessonId)) {
      throw new NotFoundError('Exercise not found.');
    }
    const exercise = await Exercise.findOne({ lessonId });
    if (!exercise) throw new NotFoundError('No exercise found for this lesson.');
    return exercise;
  }

  static async runAgainstExercise(
    userId: string,
    exerciseId: string,
    code: string,
    language: Judge0Language
  ) {
    // BR-44: 20 runs per day per user
    await CodeExecutionService.checkRateLimit(userId);

    if (!mongoose.isValidObjectId(exerciseId)) {
      throw new NotFoundError('Exercise not found.');
    }
    const exercise = await Exercise.findById(exerciseId);
    if (!exercise) throw new NotFoundError('Exercise not found.');
    if (exercise.language !== language) {
      throw new BadRequestError(`This exercise requires ${exercise.language}.`);
    }
    if (exercise.testCases.length === 0) {
      throw new BadRequestError('This exercise has no test cases configured.');
    }

    // Run test cases sequentially to avoid overloading Judge0
    const testResults: {
      passed: boolean;
      actualOutput: string;
      stderr: string;
      isError: boolean;
      executionTime: number;
      memory: number;
    }[] = [];

    for (const tc of exercise.testCases) {
      const result = await Judge0Service.execute(
        code,
        language,
        tc.input,
        exercise.timeLimit
      );
      const isError = result.statusId !== 3 && result.statusId !== 4; // not ACCEPTED or WRONG_ANSWER
      testResults.push({
        passed: result.statusId === 3 && result.stdout.trim() === tc.expectedOutput.trim(),
        actualOutput: result.stdout,
        stderr: result.stderr || (result.compileOutput ?? ''),
        isError,
        executionTime: Math.round(parseFloat(result.time || '0') * 1000), // ms
        memory: result.memory,
      });
    }

    const passedCases = testResults.filter((r) => r.passed).length;
    const totalCases = exercise.testCases.length;
    const earnedPoints = exercise.testCases.reduce(
      (sum, tc, i) => sum + (testResults[i].passed ? tc.points : 0),
      0
    );
    const firstStderr = testResults.find((r) => r.stderr)?.stderr || '';

    let verdict: 'PASS' | 'FAIL' | 'PARTIAL' | 'ERROR';
    // Treat compilation/runtime errors as ERROR verdict
    if (passedCases === 0 && (firstStderr || testResults.some((r) => r.isError))) {
      verdict = 'ERROR';
    } else if (passedCases === totalCases) {
      verdict = 'PASS';
    } else if (passedCases === 0) {
      verdict = 'FAIL';
    } else {
      verdict = 'PARTIAL';
    }

    const execution = await CodeExecution.create({
      userId,
      exerciseId,
      code,
      language,
      status: verdict,
      actualOutput: testResults[0]?.actualOutput || '',
      expectedOutput: exercise.testCases[0]?.expectedOutput || '',
      passedCases,
      totalCases,
      executionTime: testResults.reduce((sum, r) => sum + r.executionTime, 0),
      memoryUsage: Math.round(
        testResults.reduce((sum, r) => sum + r.memory, 0) / totalCases
      ),
      stderr: firstStderr,
    });

    return {
      executionId: execution._id,
      verdict,
      passedCases,
      totalCases,
      score: earnedPoints,
      testResults: exercise.testCases.map((tc, i) => ({
        passed: testResults[i].passed,
        isHidden: tc.isHidden,
        input: tc.isHidden ? null : tc.input,
        expectedOutput: tc.isHidden ? null : tc.expectedOutput,
        actualOutput: tc.isHidden ? null : testResults[i].actualOutput,
        executionTime: testResults[i].executionTime,
      })),
    };
  }

  static async getHistory(userId: string, exerciseId: string, page = 1, limit = 10) {
    if (!exerciseId || !mongoose.isValidObjectId(exerciseId)) {
      throw new BadRequestError('A valid exerciseId query parameter is required.');
    }

    const skip = (page - 1) * limit;
    const [history, total] = await Promise.all([
      CodeExecution.find({ userId, exerciseId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CodeExecution.countDocuments({ userId, exerciseId }),
    ]);

    return {
      data: history,
      total,
      page,
      limit,
      hasMore: skip + history.length < total,
    };
  }

  private static async checkRateLimit(userId: string) {
    const key = todayKey(userId);
    const redis = getRedisClient();

    if (redis.isOpen) {
      try {
        const hits = await redis.incr(key);
        if (hits === 1) {
          // Expire at midnight UTC: seconds remaining in this day
          const now = new Date();
          const secondsUntilMidnight =
            86400 - (now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds());
          await redis.expire(key, secondsUntilMidnight);
        }
        if (hits > CODE_RUN_LIMIT) {
          throw new TooManyRequestsError(
            `Daily code execution limit reached. Maximum ${CODE_RUN_LIMIT} submissions per day.`
          );
        }
        return;
      } catch (err) {
        if (err instanceof TooManyRequestsError) throw err;
        logger.warn('Redis code-run rate limit unavailable, falling back to in-memory.', err);
      }
    }

    // In-memory fallback (resets at process restart)
    const now = Date.now();
    const record = codeRunStore.get(key);
    if (!record || now > record.resetTime) {
      const midnight = new Date();
      midnight.setUTCHours(24, 0, 0, 0);
      codeRunStore.set(key, { count: 1, resetTime: midnight.getTime() });
      return;
    }
    record.count++;
    if (record.count > CODE_RUN_LIMIT) {
      throw new TooManyRequestsError(
        `Daily code execution limit reached. Maximum ${CODE_RUN_LIMIT} submissions per day.`
      );
    }
  }
}

export default CodeExecutionService;
