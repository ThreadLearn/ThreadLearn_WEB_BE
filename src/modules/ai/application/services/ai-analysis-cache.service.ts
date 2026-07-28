import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { AIAnalysisCache } from '../../models/ai-analysis-cache.model';

export interface CachedAnalysisResult {
  issues: unknown[];
  docs_used: unknown[];
}

@Injectable()
export class AIAnalysisCacheService {
  static readonly TTL_MS = 60 * 60 * 1000;

  key(inputCode: string, language: string) {
    return createHash('sha256').update(JSON.stringify({ inputCode, language: language.toLowerCase() })).digest('hex');
  }

  async get(key: string): Promise<CachedAnalysisResult | null> {
    const cache = await AIAnalysisCache.findOne({ key, expiresAt: { $gt: new Date() } }).lean();
    return (cache?.result as CachedAnalysisResult | undefined) ?? null;
  }

  async set(key: string, result: CachedAnalysisResult): Promise<void> {
    const update = { $set: { result, expiresAt: new Date(Date.now() + AIAnalysisCacheService.TTL_MS) } };
    try {
      await AIAnalysisCache.findOneAndUpdate({ key }, update, { upsert: true, new: true, setDefaultsOnInsert: true });
    } catch (error: any) {
      // A simultaneous first cache write can race on the unique key; the
      // second writer updates the winner instead of failing the analysis.
      if (error?.code !== 11000) throw error;
      await AIAnalysisCache.findOneAndUpdate({ key }, update, { new: true });
    }
  }
}
