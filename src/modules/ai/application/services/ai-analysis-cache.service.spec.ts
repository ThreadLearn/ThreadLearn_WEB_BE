import { AIAnalysisCache } from '../../models/ai-analysis-cache.model';
import { AIAnalysisCacheService } from './ai-analysis-cache.service';

describe('AIAnalysisCacheService', () => {
  afterEach(() => jest.restoreAllMocks());

  it('uses a deterministic SHA-256 key across equivalent language case', () => {
    const service = new AIAnalysisCacheService();
    expect(service.key('console.log(1)', 'JavaScript')).toMatch(/^[a-f0-9]{64}$/);
    expect(service.key('console.log(1)', 'JavaScript')).toBe(service.key('console.log(1)', 'javascript'));
  });

  it('writes an expiry one hour in the future', async () => {
    const update = jest.spyOn(AIAnalysisCache, 'findOneAndUpdate').mockResolvedValue({} as any);
    const before = Date.now();
    await new AIAnalysisCacheService().set('key', { issues: [], docs_used: [] });
    const expiresAt = (update.mock.calls[0][1] as any).$set.expiresAt.getTime();
    expect(expiresAt).toBeGreaterThanOrEqual(before + AIAnalysisCacheService.TTL_MS - 10);
  });
});
