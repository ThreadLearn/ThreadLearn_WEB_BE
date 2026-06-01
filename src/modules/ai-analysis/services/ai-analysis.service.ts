import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import mongoose from 'mongoose';
import { IAIAnalysis } from '../models/ai-analysis.model';
import { IUser } from '../../auth/models/user.model';
import { RedisService } from '../../../config/redis.service';
import { AIEngineService } from './ai-engine.service';
import { BadRequestError, ForbiddenError, NotFoundError, TooManyRequestsError } from '../../../common/custom-error';

const FREE_QUOTA    = 10;
const PREMIUM_QUOTA = 40;

const quotaStore = new Map<string, { count: number; resetTime: number }>();

function pruneQuotaStore() {
  const now = Date.now();
  quotaStore.forEach((v, k) => { if (now > v.resetTime) quotaStore.delete(k); });
}

function quotaKey(userId: string) {
  return `ai:${userId}:${new Date().toISOString().slice(0, 10)}`;
}
function secondsUntilMidnight() {
  const now = new Date();
  return 86400 - (now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds());
}

interface RequestAnalysisDto { inputCode: string; language: string; codeExecutionId?: string; }

@Injectable()
export class AIAnalysisService {
  private readonly logger = new Logger(AIAnalysisService.name);

  constructor(
    @InjectModel('AIAnalysis') private aiAnalysisModel: Model<IAIAnalysis>,
    @InjectModel('User')       private userModel:       Model<IUser>,
    private readonly redisService:  RedisService,
    private readonly aiEngine:      AIEngineService,
  ) {}

  async checkQuota(userId: string, isPremium: boolean) {
    const key   = quotaKey(userId);
    const limit = isPremium ? PREMIUM_QUOTA : FREE_QUOTA;

    if (this.redisService.isOpen) {
      try {
        const raw  = await this.redisService.get(key);
        const used = parseInt(raw ?? '0', 10);
        return { used, remaining: Math.max(0, limit - used), limit };
      } catch {}
    }
    const now    = Date.now();
    const record = quotaStore.get(key);
    const used   = record && now < record.resetTime ? record.count : 0;
    return { used, remaining: Math.max(0, limit - used), limit };
  }

  async requestAnalysis(userId: string, dto: RequestAnalysisDto) {
    if (!dto.inputCode?.trim())         throw new BadRequestError('Code cannot be empty.');
    if (dto.inputCode.length > 5000)    throw new BadRequestError('Code must be at most 5000 characters.');

    const user = await this.userModel.findById(userId)
      .select('isPremium').lean<{ isPremium?: boolean }>();
    if (!user) throw new NotFoundError('User not found.');
    const isPremium = user.isPremium ?? false;

    const key   = quotaKey(userId);
    const limit = isPremium ? PREMIUM_QUOTA : FREE_QUOTA;
    await this.incrementQuota(userId, key, limit, isPremium);

    const codeExecutionId =
      dto.codeExecutionId && mongoose.isValidObjectId(dto.codeExecutionId)
        ? new mongoose.Types.ObjectId(dto.codeExecutionId)
        : undefined;

    // L21 — pre-increment quota for fairness, but rollback on AI failure so
    // users don't lose a quota slot when OpenAI/network errors.
    let analysis;
    try {
      analysis = await this.aiEngine.analyze(dto.inputCode, dto.language);
    } catch (err) {
      await this.decrementQuota(userId, key).catch(() => { /* noop */ });
      throw err;
    }

    const record = await this.aiAnalysisModel.create({
      userId,
      codeExecutionId,
      inputCode:      dto.inputCode,
      language:       dto.language,
      suggestions:    analysis.suggestions,
      raceConditions: analysis.raceConditions,
      optimizedCode:  analysis.optimizedCode,
      tokensUsed:     analysis.tokensUsed,
    });

    const quota = await this.checkQuota(userId, isPremium);
    return {
      analysisId:     record._id,
      suggestions:    analysis.suggestions,
      raceConditions: analysis.raceConditions,
      optimizedCode:  isPremium ? analysis.optimizedCode : undefined,
      explanation:    analysis.explanation,
      remainingQuota: quota.remaining,
      quotaLimit:     quota.limit,
    };
  }

  async getHistory(userId: string, page = 1, limit = 10) {
    const user = await this.userModel.findById(userId)
      .select('isPremium').lean<{ isPremium?: boolean }>();
    if (!user) throw new NotFoundError('User not found.');
    if (!user.isPremium) {
      throw new ForbiddenError('Analysis history is available for Premium users only.');
    }

    const skip = (page - 1) * limit;
    const [history, total] = await Promise.all([
      this.aiAnalysisModel.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).select('-inputCode').lean(),
      this.aiAnalysisModel.countDocuments({ userId }),
    ]);
    return { data: history, total, page, limit, hasMore: skip + history.length < total };
  }

  private async incrementQuota(userId: string, key: string, limit: number, isPremium: boolean) {
    if (this.redisService.isOpen) {
      try {
        const hits = await this.redisService.incr(key);
        if (hits === 1) await this.redisService.expire(key, secondsUntilMidnight());
        if (hits > limit) throw new TooManyRequestsError(
          `Daily AI quota reached (${limit}${isPremium ? ' Premium' : ' Free — upgrade for more'}).`,
        );
        return;
      } catch (err) {
        if (err instanceof TooManyRequestsError) throw err;
        this.logger.warn('Redis quota increment failed, using in-memory.', err);
      }
    }

    pruneQuotaStore();
    const now     = Date.now();
    const midnight = new Date(); midnight.setUTCHours(24, 0, 0, 0);
    const record  = quotaStore.get(key);

    if (!record || now > record.resetTime) {
      quotaStore.set(key, { count: 1, resetTime: midnight.getTime() });
      return;
    }
    record.count++;
    if (record.count > limit) {
      throw new TooManyRequestsError(`Daily AI quota reached (${limit}).`);
    }
  }

  /** L21 — release quota on AI provider failure. */
  private async decrementQuota(_userId: string, key: string) {
    if (this.redisService.isOpen) {
      try {
        await this.redisService.set(key, String(Math.max(0, parseInt(
          (await this.redisService.get(key)) ?? '0', 10) - 1)));
        return;
      } catch { /* fall through to in-memory */ }
    }
    const rec = quotaStore.get(key);
    if (rec && rec.count > 0) rec.count -= 1;
  }
}
