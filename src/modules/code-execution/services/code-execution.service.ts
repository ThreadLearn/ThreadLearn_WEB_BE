import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import mongoose from 'mongoose';
import { IExercise } from '../models/exercise.model';
import { ICodeExecution } from '../models/code-execution.model';
import { RedisService } from '../../../config/redis.service';
import { Judge0Service, Judge0Language } from './judge0.service';
import { BadRequestError, NotFoundError } from '../../../common/custom-error';

const CODE_RUN_LIMIT = 20;

// In-memory fallback when Redis is unavailable
const codeRunStore = new Map<string, { count: number; resetTime: number }>();

function pruneStore() {
  const now = Date.now();
  codeRunStore.forEach((v, k) => { if (now > v.resetTime) codeRunStore.delete(k); });
}

function todayKey(userId: string): string {
  return `exec:${userId}:${new Date().toISOString().slice(0, 10)}`;
}

@Injectable()
export class CodeExecutionService {
  private readonly logger = new Logger(CodeExecutionService.name);

  constructor(
    @InjectModel('Exercise')      private exerciseModel:      Model<IExercise>,
    @InjectModel('CodeExecution') private codeExecutionModel: Model<ICodeExecution>,
    private readonly redisService: RedisService,
    private readonly judge0:       Judge0Service,
  ) {}

  async getExerciseByLesson(lessonId: string) {
    if (!mongoose.isValidObjectId(lessonId)) throw new NotFoundError('Exercise not found.');
    const exercise = await this.exerciseModel.findOne({ lessonId });
    if (!exercise) throw new NotFoundError('No exercise found for this lesson.');
    return exercise;
  }

  async runAgainstExercise(
    userId: string,
    exerciseId: string,
    code: string,
    language: Judge0Language,
  ) {
    await this.checkRateLimit(userId);

    if (!mongoose.isValidObjectId(exerciseId)) throw new NotFoundError('Exercise not found.');
    const exercise = await this.exerciseModel.findById(exerciseId);
    if (!exercise) throw new NotFoundError('Exercise not found.');
    if (exercise.language !== language) {
      throw new BadRequestError(`This exercise requires ${exercise.language}.`);
    }
    if (!exercise.testCases.length) {
      throw new BadRequestError('This exercise has no test cases configured.');
    }

    const testResults: { passed: boolean; actualOutput: string; stderr: string; isError: boolean; executionTime: number; memory: number }[] = [];

    for (const tc of exercise.testCases) {
      const r = await this.judge0.execute(code, language, tc.input, exercise.timeLimit);
      const isError = r.statusId !== 3 && r.statusId !== 4;
      testResults.push({
        passed:        r.statusId === 3 && r.stdout.trim() === tc.expectedOutput.trim(),
        actualOutput:  r.stdout,
        stderr:        r.stderr || (r.compileOutput ?? ''),
        isError,
        executionTime: Math.round(parseFloat(r.time || '0') * 1000),
        memory:        r.memory,
      });
    }

    const passedCases  = testResults.filter((r) => r.passed).length;
    const totalCases   = exercise.testCases.length;
    const earnedPoints = exercise.testCases.reduce(
      (sum, tc, i) => sum + (testResults[i].passed ? tc.points : 0), 0,
    );
    const firstStderr  = testResults.find((r) => r.stderr)?.stderr || '';

    let verdict: 'PASS' | 'FAIL' | 'PARTIAL' | 'ERROR';
    if (passedCases === 0 && (firstStderr || testResults.some((r) => r.isError))) {
      verdict = 'ERROR';
    } else if (passedCases === totalCases) {
      verdict = 'PASS';
    } else if (passedCases === 0) {
      verdict = 'FAIL';
    } else {
      verdict = 'PARTIAL';
    }

    const execution = await this.codeExecutionModel.create({
      userId, exerciseId, code, language, status: verdict,
      actualOutput:  testResults[0]?.actualOutput || '',
      expectedOutput: exercise.testCases[0]?.expectedOutput || '',
      passedCases, totalCases,
      executionTime: testResults.reduce((s, r) => s + r.executionTime, 0),
      memoryUsage:   Math.round(testResults.reduce((s, r) => s + r.memory, 0) / totalCases),
      stderr: firstStderr,
    });

    return {
      executionId:  execution._id,
      verdict, passedCases, totalCases,
      score: earnedPoints,
      testResults: exercise.testCases.map((tc, i) => ({
        passed:        testResults[i].passed,
        isHidden:      tc.isHidden,
        input:         tc.isHidden ? null : tc.input,
        expectedOutput: tc.isHidden ? null : tc.expectedOutput,
        actualOutput:  tc.isHidden ? null : testResults[i].actualOutput,
        executionTime: testResults[i].executionTime,
      })),
    };
  }

  async getHistory(userId: string, exerciseId: string, page = 1, limit = 10) {
    if (!exerciseId || !mongoose.isValidObjectId(exerciseId)) {
      throw new BadRequestError('A valid exerciseId query parameter is required.');
    }
    const skip = (page - 1) * limit;
    const [history, total] = await Promise.all([
      this.codeExecutionModel.find({ userId, exerciseId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      this.codeExecutionModel.countDocuments({ userId, exerciseId }),
    ]);
    return { data: history, total, page, limit, hasMore: skip + history.length < total };
  }

  private async checkRateLimit(userId: string) {
    const key = todayKey(userId);

    if (this.redisService.isOpen) {
      try {
        const hits = await this.redisService.incr(key);
        if (hits === 1) {
          const now = new Date();
          const ttl = 86400 - (now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds());
          await this.redisService.expire(key, ttl);
        }
        if (hits > CODE_RUN_LIMIT) {
          throw new BadRequestError(`Daily code execution limit reached (${CODE_RUN_LIMIT}/day).`);
        }
        return;
      } catch (err) {
        if (err instanceof BadRequestError) throw err;
        this.logger.warn('Redis rate limit unavailable, using in-memory fallback.', err);
      }
    }

    pruneStore();
    const now     = Date.now();
    const record  = codeRunStore.get(key);
    if (!record || now > record.resetTime) {
      const midnight = new Date(); midnight.setUTCHours(24, 0, 0, 0);
      codeRunStore.set(key, { count: 1, resetTime: midnight.getTime() });
      return;
    }
    record.count++;
    if (record.count > CODE_RUN_LIMIT) {
      throw new BadRequestError(`Daily code execution limit reached (${CODE_RUN_LIMIT}/day).`);
    }
  }
}
