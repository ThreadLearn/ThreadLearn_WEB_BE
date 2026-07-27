import { CodeExecutionService } from './code-execution.service';

describe('CodeExecutionService', () => {
  it('releases an atomically reserved run when Judge0 is not configured', async () => {
    const quotas = {
      reserve: jest.fn().mockResolvedValue({ userId: '507f1f77bcf86cd799439011', scope: 'code-execution', day: '2026-07-28', count: 1 }),
      release: jest.fn().mockResolvedValue(undefined),
    };
    const service = new CodeExecutionService({ create: jest.fn() } as any, {} as any, quotas as any);

    await expect(service.executeCode('507f1f77bcf86cd799439011', { sourceCode: 'console.log(1)', language: 'javascript' }))
      .rejects.toMatchObject({ statusCode: 503, code: 'JUDGE0_NOT_CONFIGURED' });
    expect(quotas.reserve).toHaveBeenCalledWith('507f1f77bcf86cd799439011', 'code-execution', 20);
    expect(quotas.release).toHaveBeenCalledTimes(1);
  });
});
