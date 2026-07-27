import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';
import { AIUserProfile, IAIHistoryRepository } from '../../domain/interfaces/ai-history.repository';
import { AIRecommendationPayload } from '../dto/ai.dto';
import { RequestRecommendationService } from './request-recommendation.service';

describe('RequestRecommendationService', () => {
  const buildUser = (overrides: Partial<AIUserProfile> = {}): AIUserProfile => ({
    id: 'user-1',
    firstName: 'Ada',
    lastName: 'Lovelace',
    role: 'STUDENT',
    planType: 'FREE',
    ...overrides,
  });

  const buildRepo = (user: AIUserProfile | null, usedToday = 0): jest.Mocked<IAIHistoryRepository> => ({
    create: jest.fn(async (entity) => entity),
    listByUser: jest.fn(),
    findByUserAndId: jest.fn(),
    updateFeedback: jest.fn(),
    countToday: jest.fn().mockResolvedValue(usedToday),
    findUserProfile: jest.fn().mockResolvedValue(user),
    findCourseProfile: jest.fn(),
    purgeFreeHistory: jest.fn(),
  });

  const buildHttp = (response: unknown) => ({
    post: jest.fn().mockReturnValue(of({ data: response } as AxiosResponse)),
  });

  const payload: AIRecommendationPayload = {
    inputCode: 'for(var i=0;i<3;i++){setTimeout(()=>console.log(i));}',
    language: 'javascript',
  };

  it('calls the AI analyze endpoint and maps issues into history fields', async () => {
    const repo = buildRepo(buildUser());
    const http = buildHttp({
      user_id: 'user-1',
      language: 'javascript',
      issues: [
        {
          line_range: '1-3',
          severity: 'high',
          description: 'Closure captures loop variable declared with var.',
          fix: 'Use let instead of var.',
          pattern_id: 'closure_loop_var',
        },
      ],
      docs_used: [{ id: 'doc-1', title: 'Closure Loop Variable', category: 'patterns', bm25_score: 12.5 }],
      cached: false,
    });
    const service = new RequestRecommendationService(repo, http as any);

    const result: any = await service.execute('user-1', payload);

    expect(http.post).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/ai/analyze'),
      { code: payload.inputCode, language: payload.language, user_id: 'user-1' },
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: expect.stringMatching(/^Bearer /) }) }),
    );
    expect(repo.create).toHaveBeenCalled();
    expect(result.props.suggestions).toEqual(['[high] Closure captures loop variable declared with var.']);
    expect(result.props.raceConditions).toEqual(['1-3: Closure captures loop variable declared with var.']);
    expect(result.props.optimizedCode).toBeUndefined();
    expect(result.remainingQuota).toBe(9);
    expect(result.quotaLimit).toBe(10);
    expect(result.props.modelName).toBe('threadlearn-ai2-server');
    expect(result.props.category).toBe('code-analysis');
    expect(result.props.issues).toEqual([
      {
        patternId: 'closure_loop_var',
        lineRange: '1-3',
        severity: 'high',
        description: 'Closure captures loop variable declared with var.',
        fix: 'Use let instead of var.',
      },
    ]);
    expect(result.props.docsUsed).toEqual([
      { id: 'doc-1', title: 'Closure Loop Variable', category: 'patterns', score: 12.5 },
    ]);
    expect(result.props.cached).toBe(false);
  });

  it('produces an empty analysis summary when the AI service finds no issues', async () => {
    const repo = buildRepo(buildUser());
    const http = buildHttp({ user_id: 'user-1', language: 'javascript', issues: [], docs_used: [], cached: false });
    const service = new RequestRecommendationService(repo, http as any);

    const result: any = await service.execute('user-1', payload);

    expect(result.props.suggestions).toEqual([]);
    expect(result.props.explanation).toBe('No concurrency issues detected in this code.');
  });

  it('rejects when inputCode is missing', async () => {
    const repo = buildRepo(buildUser());
    const http = buildHttp({ issues: [] });
    const service = new RequestRecommendationService(repo, http as any);

    await expect(service.execute('user-1', { language: 'javascript' } as AIRecommendationPayload)).rejects.toThrow(
      'inputCode is required.',
    );
    expect(http.post).not.toHaveBeenCalled();
  });

  it('rejects when the user profile does not exist', async () => {
    const repo = buildRepo(null);
    const http = buildHttp({ issues: [] });
    const service = new RequestRecommendationService(repo, http as any);

    await expect(service.execute('missing-user', payload)).rejects.toThrow('User profile not found.');
    expect(http.post).not.toHaveBeenCalled();
  });

  it('blocks the request once the free daily limit is reached', async () => {
    const repo = buildRepo(buildUser({ planType: 'FREE' }), 10);
    const http = buildHttp({ issues: [] });
    const service = new RequestRecommendationService(repo, http as any);

    await expect(service.execute('user-1', payload)).rejects.toMatchObject({
      statusCode: 429,
      code: 'AI_QUOTA_EXCEEDED',
    });
    expect(http.post).not.toHaveBeenCalled();
  });

  it('allows premium users past the free daily limit', async () => {
    const repo = buildRepo(buildUser({ planType: 'PREMIUM' }), 10);
    const http = buildHttp({ issues: [] });
    const service = new RequestRecommendationService(repo, http as any);

    await expect(service.execute('user-1', payload)).resolves.toBeDefined();
    expect(http.post).toHaveBeenCalled();
  });

  it('propagates errors from the AI service call', async () => {
    const repo = buildRepo(buildUser());
    const http = { post: jest.fn().mockReturnValue(throwError(() => new Error('ECONNREFUSED'))) };
    const service = new RequestRecommendationService(repo, http as any);

    await expect(service.execute('user-1', payload)).rejects.toThrow('ECONNREFUSED');
    expect(repo.create).not.toHaveBeenCalled();
  });
});
