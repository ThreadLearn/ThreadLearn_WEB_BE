import { getRedisClient } from '../../../configs/redis';
import { logger } from '../../../configs/logger';
import { AIAnalysis } from '../models/ai-analysis.model';
import { User } from '../../auth/models/user.model';
import { AIEngineService } from './ai-engine.service';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../common/custom-error';
import { TooManyRequestsError } from '../../../middlewares/rate-limit.middleware';
import mongoose from 'mongoose';

const FREE_QUOTA = 10;
const PREMIUM_QUOTA = 40;

// In-memory fallback when Redis is unavailable
const quotaStore = new Map<string, { count: number; resetTime: number }>();

function quotaKey(userId: string): string {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return `ai:${userId}:${date}`;
}

function secondsUntilMidnight(): number {
  const now = new Date();
  return (
    86400 -
    (now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds())
  );
}

interface RequestAnalysisDto {
  inputCode: string;
  language: string;
  codeExecutionId?: string;
}

export class AIAnalysisService {
  static async checkQuota(userId: string, isPremium: boolean) {
    const key = quotaKey(userId);
    const limit = isPremium ? PREMIUM_QUOTA : FREE_QUOTA;
    const redis = getRedisClient();

    if (redis.isOpen) {
      try {
        const raw = await redis.get(key);
        const used = parseInt(raw ?? '0', 10);
        return { used, remaining: Math.max(0, limit - used), limit };
      } catch (err) {
        logger.warn('Redis quota read failed.', err);
      }
    }

    const now = Date.now();
    const record = quotaStore.get(key);
    const used = record && now < record.resetTime ? record.count : 0;
    return { used, remaining: Math.max(0, limit - used), limit };
  }

  static async requestAnalysis(userId: string, dto: RequestAnalysisDto) {
    // BR-51: Input validation
    if (!dto.inputCode?.trim()) {
      throw new BadRequestError('Code cannot be empty.');
    }
    if (dto.inputCode.length > 5000) {
      throw new BadRequestError('Code must be at most 5000 characters.');
    }

    // Resolve isPremium from DB (not in JWT payload)
    const user = await User.findById(userId).select('isPremium').lean();
    if (!user) throw new NotFoundError('User not found.');
    const isPremium = (user as any).isPremium ?? false;

    // BR-51: Quota check
    const key = quotaKey(userId);
    const limit = isPremium ? PREMIUM_QUOTA : FREE_QUOTA;
    await AIAnalysisService.incrementQuota(userId, key, limit, isPremium);

    // Validate optional codeExecutionId
    const codeExecutionId =
      dto.codeExecutionId && mongoose.isValidObjectId(dto.codeExecutionId)
        ? new mongoose.Types.ObjectId(dto.codeExecutionId)
        : undefined;

    // Call AI engine (Redis-cached by sha256(code+language))
    const analysis = await AIEngineService.analyze(dto.inputCode, dto.language);

    // Persist to DB — both Free and Premium users get a record saved
    const record = await AIAnalysis.create({
      userId,
      codeExecutionId,
      inputCode: dto.inputCode,
      language: dto.language,
      suggestions: analysis.suggestions,
      raceConditions: analysis.raceConditions,
      tokensUsed: analysis.tokensUsed,
    });

    const quota = await AIAnalysisService.checkQuota(userId, isPremium);

    return {
      analysisId: record._id,
      suggestions: analysis.suggestions,
      raceConditions: analysis.raceConditions,
      optimizedCode: analysis.optimizedCode,
      explanation: analysis.explanation,
      remainingQuota: quota.remaining,
      quotaLimit: quota.limit,
    };
  }

  // Premium-only: Free users get a 403 here
  static async getHistory(userId: string, isPremium: boolean, page = 1, limit = 10) {
    if (!isPremium) {
      throw new ForbiddenError('Analysis history is available for Premium users only.');
    }

    const skip = (page - 1) * limit;
    const [history, total] = await Promise.all([
      AIAnalysis.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-inputCode') // omit full code from list for lighter responses
        .lean(),
      AIAnalysis.countDocuments({ userId }),
    ]);

    return {
      data: history,
      total,
      page,
      limit,
      hasMore: skip + history.length < total,
    };
  }

  private static async incrementQuota(
    userId: string,
    key: string,
    limit: number,
    isPremium: boolean
  ) {
    const redis = getRedisClient();

    if (redis.isOpen) {
      try {
        const hits = await redis.incr(key);
        if (hits === 1) {
          await redis.expire(key, secondsUntilMidnight());
        }
        if (hits > limit) {
          throw new TooManyRequestsError(
            `Daily AI analysis quota reached. Limit: ${limit}${isPremium ? ' (Premium)' : ' (Free — upgrade for more)'}.`
          );
        }
        return;
      } catch (err) {
        if (err instanceof TooManyRequestsError) throw err;
        logger.warn('Redis quota increment failed, falling back to in-memory.', err);
      }
    }

    // In-memory fallback
    const now = Date.now();
    const midnight = new Date();
    midnight.setUTCHours(24, 0, 0, 0);
    const record = quotaStore.get(key);

    if (!record || now > record.resetTime) {
      quotaStore.set(key, { count: 1, resetTime: midnight.getTime() });
      return;
    }
    record.count++;
    if (record.count > limit) {
      throw new TooManyRequestsError(
        `Daily AI analysis quota reached. Limit: ${limit}${isPremium ? ' (Premium)' : ' (Free — upgrade for more)'}.`
      );
    }
  }
}

export default AIAnalysisService;
