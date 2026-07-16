import { UserStats, UserStatsProps } from '../../domain/entities/user-stats.entity';
import {
  IUserStatsRepository,
  XpAwardSourceType,
} from '../../domain/interfaces/user-stats.repository';
import {
  IGamificationRealtimePort,
  XpAwardedRealtimePayload,
} from '../../domain/interfaces/gamification-realtime.port';
import { AwardXpService } from '../services/award-xp.service';
import { UpdateStreakService } from '../services/update-streak.service';
import { GamificationRewardsEventHandler } from './gamification-rewards.event-handler';

describe('GamificationRewardsEventHandler', () => {
  it('awards quiz XP once per attempt and emits realtime updates once', async () => {
    const statsRepository = new InMemoryUserStatsRepository();
    const realtime = new CapturingRealtimePort();
    const handler = new GamificationRewardsEventHandler(
      new AwardXpService(statsRepository),
      new UpdateStreakService(statsRepository),
      realtime,
    );
    const event = {
      userId: 'student-1',
      quizId: 'quiz-1',
      attemptId: 'attempt-1',
      xpReward: 150,
    };

    await (handler as any).handleQuizPassed(event);
    await (handler as any).handleQuizPassed(event);

    const stats = await statsRepository.findByUserId('student-1');
    expect(stats?.toProps()).toMatchObject({
      xp: 150,
      level: 1,
      quizzesCompleted: 1,
    });
    expect(realtime.xpEvents).toEqual([
      {
        userId: 'student-1',
        payload: {
          xp: 150,
          totalXp: 150,
          level: 1,
        },
      },
    ]);
    expect(realtime.leaderboardUpdates).toBe(1);
  });
});

class InMemoryUserStatsRepository implements IUserStatsRepository {
  private statsByUser = new Map<string, UserStatsProps & { id: string }>();
  private claims = new Set<string>();

  async findByUserId(userId: string): Promise<UserStats | null> {
    const props = this.statsByUser.get(userId);
    return props ? UserStats.fromPersistence(cloneStats(props), props.id) : null;
  }

  async findOrCreate(userId: string): Promise<UserStats> {
    const existing = await this.findByUserId(userId);
    if (existing) return existing;

    const stats = UserStats.createNew(userId);
    await this.save(stats);
    return stats;
  }

  async save(stats: UserStats): Promise<UserStats> {
    const props = stats.toProps();
    this.statsByUser.set(props.userId, cloneStats(props));
    return UserStats.fromPersistence(cloneStats(props), props.id);
  }

  async claimXpAward(sourceType: XpAwardSourceType, sourceId: string, userId: string): Promise<boolean> {
    const key = `${sourceType}:${sourceId}:${userId}`;
    if (this.claims.has(key)) return false;
    this.claims.add(key);
    return true;
  }

  async findTopByXp(): Promise<UserStats[]> {
    return [];
  }

  async findRankByUserId(): Promise<number | null> {
    return null;
  }
}

class CapturingRealtimePort implements IGamificationRealtimePort {
  readonly xpEvents: Array<{ userId: string; payload: XpAwardedRealtimePayload }> = [];
  leaderboardUpdates = 0;

  emitXpAwarded(userId: string, payload: XpAwardedRealtimePayload): void {
    this.xpEvents.push({ userId, payload });
  }

  emitLeaderboardUpdate(): void {
    this.leaderboardUpdates += 1;
  }
}

function cloneStats(props: UserStatsProps & { id: string }): UserStatsProps & { id: string } {
  return {
    ...props,
    lastActiveDate: new Date(props.lastActiveDate),
  };
}
