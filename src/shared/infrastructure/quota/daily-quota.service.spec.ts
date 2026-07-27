import { DailyQuota } from './daily-quota.model';
import { DailyQuotaService } from './daily-quota.service';

describe('DailyQuotaService', () => {
  afterEach(() => jest.restoreAllMocks());

  it('reserves only through a conditional atomic increment', async () => {
    const lean = jest.fn().mockResolvedValue({ count: 20 });
    const update = jest.spyOn(DailyQuota, 'findOneAndUpdate').mockReturnValue({ lean } as any);
    const service = new DailyQuotaService();

    await expect(service.reserve('507f1f77bcf86cd799439011', 'code-execution', 20, new Date('2026-07-28T12:00:00Z')))
      .resolves.toMatchObject({ count: 20, scope: 'code-execution', day: '2026-07-28' });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ count: { $lt: 20 } }),
      expect.objectContaining({ $inc: { count: 1 } }),
      expect.objectContaining({ upsert: true }),
    );
  });

  it('retries without upsert after a concurrent unique-key insert race', async () => {
    const first = jest.fn().mockReturnValue({ lean: jest.fn().mockRejectedValue({ code: 11000 }) });
    const second = jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ count: 2 }) });
    jest.spyOn(DailyQuota, 'findOneAndUpdate').mockImplementationOnce(first as any).mockImplementationOnce(second as any);

    const result = await new DailyQuotaService().reserve('507f1f77bcf86cd799439011', 'ai-recommendation', 10, new Date('2026-07-28T12:00:00Z'));
    expect(result?.count).toBe(2);
    expect(second).toHaveBeenCalledWith(expect.anything(), { $inc: { count: 1 } }, { new: true });
  });
});
