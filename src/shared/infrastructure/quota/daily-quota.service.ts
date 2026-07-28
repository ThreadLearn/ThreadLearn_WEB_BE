import { Injectable } from '@nestjs/common';
import { DailyQuota } from './daily-quota.model';

export type DailyQuotaReservation = {
  userId: string;
  scope: string;
  day: string;
  count: number;
};

/**
 * A Mongo conditional update is used instead of count-then-create. The
 * `{ count: { $lt: limit } }` predicate and the unique compound index make
 * the reservation safe across concurrent requests and application instances.
 */
@Injectable()
export class DailyQuotaService {
  private utcDay(now = new Date()) {
    return now.toISOString().slice(0, 10);
  }

  async reserve(userId: string, scope: string, limit: number, now = new Date()): Promise<DailyQuotaReservation | null> {
    const day = this.utcDay(now);
    const filter = { userId, scope, day, count: { $lt: limit } };
    const update = { $inc: { count: 1 }, $setOnInsert: { userId, scope, day } };

    try {
      const quota = await DailyQuota.findOneAndUpdate(filter, update, {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }).lean();
      return quota ? { userId, scope, day, count: quota.count } : null;
    } catch (error: any) {
      // Two first requests may race to insert the same unique row. Retry the
      // conditional increment without upsert; a full quota remains null.
      if (error?.code !== 11000) throw error;
      const quota = await DailyQuota.findOneAndUpdate(filter, { $inc: { count: 1 } }, { new: true }).lean();
      return quota ? { userId, scope, day, count: quota.count } : null;
    }
  }

  async release(reservation: DailyQuotaReservation): Promise<void> {
    await DailyQuota.updateOne(
      {
        userId: reservation.userId,
        scope: reservation.scope,
        day: reservation.day,
        count: { $gte: 1 },
      },
      { $inc: { count: -1 } },
    );
  }

  async status(userId: string, scope: string, limit: number, now = new Date()) {
    const day = this.utcDay(now);
    const quota = await DailyQuota.findOne({ userId, scope, day }).lean();
    const used = quota?.count ?? 0;
    return { limit, used, remaining: Math.max(0, limit - used) };
  }
}
