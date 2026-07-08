import { AwardXpService } from '../services/award-xp.service';
import { UpdateStreakService } from '../services/update-streak.service';
import { GamificationRewardsEventHandler } from './gamification-rewards.event-handler';
import { UserStats, UserStatsProps } from '../../domain/entities/user-stats.entity';
import { IUserStatsRepository, XpAwardSourceType } from '../../domain/interfaces/user-stats.repository';
import { GetMyRankService } from '../../../leaderboard/application/services/get-my-rank.service';
import { GetTopRankingsService } from '../../../leaderboard/application/services/get-top-rankings.service';
import { LeaderboardCacheEventHandler } from '../../../leaderboard/application/event-handlers/leaderboard-cache.event-handler';
import { ILeaderboardCachePort, RankedEntry } from '../../../leaderboard/domain/interfaces/leaderboard-cache.port';
import { IUserProfilePort, UserProfileDto } from '../../../leaderboard/domain/interfaces/user-profile.port';
import { QuizPassedEvent } from '../../../quiz-attempts/domain/events/quiz-passed.event';
import { SubmitAttemptService } from '../../../quiz-attempts/application/services/submit-attempt.service';
import { DomainEventPublisher } from '../../../quiz-attempts/application/events/domain-event.publisher';
import { QuizGradingService } from '../../../quiz-attempts/domain/services/quiz-grading.service';
import { IQuizAttemptRepository } from '../../../quiz-attempts/domain/interfaces/quiz-attempt.repository';
import { QuizAttempt, QuizAttemptProps } from '../../../quiz-attempts/domain/entities/quiz-attempt.entity';
import { IQuizRepository } from '../../../quiz/domain/interfaces/quiz.repository';
import { Quiz } from '../../../quiz/domain/entities/quiz.entity';
import { Question } from '../../../quiz/domain/entities/question.entity';

describe('Realtime XP and leaderboard flow', () => {
  it('emits quiz.passed with attempt id and XP reward when a submitted quiz passes', async () => {
    const question = Question.fromPersistence(
      {
        questionText: '2 + 2 = ?',
        options: ['4', '5'],
        correctAnswerIndex: 0,
      },
      'question-1',
    );
    const quiz = Quiz.fromPersistence(
      {
        title: 'Math basics',
        lessonId: 'lesson-1',
        passingScorePercent: 80,
        xpReward: 120,
        questions: [question],
        isDeleted: false,
      },
      'quiz-1',
    );
    const quizRepository = new InMemoryQuizRepository([quiz]);
    const attemptRepository = new InMemoryQuizAttemptRepository();
    const eventPublisher = new CapturingDomainEventPublisher();
    const submitAttempt = new SubmitAttemptService(
      attemptRepository,
      quizRepository,
      eventPublisher as unknown as DomainEventPublisher,
      new QuizGradingService(),
    );

    const result = await submitAttempt.execute('student-1', 'quiz-1', { 'question-1': 0 });

    expect(result.passed).toBe(true);
    expect(result.xpRewarded).toBe(120);
    expect(eventPublisher.events.map((event) => event.event)).toEqual([
      'quiz.submitted',
      'quiz.passed',
    ]);

    const passedEvent = eventPublisher.events.find((event) => event.event === 'quiz.passed')?.payload as QuizPassedEvent;
    expect(passedEvent).toMatchObject({
      userId: 'student-1',
      quizId: 'quiz-1',
      quizTitle: 'Math basics',
      attemptId: result.attempt.id,
      score: 100,
      xpReward: 120,
    });
  });

  it('awards quiz XP once per attempt and refreshes leaderboard rank from updated stats', async () => {
    const statsRepository = new InMemoryUserStatsRepository();
    await statsRepository.seed('student-2', 150);

    const leaderboardCache = new FakeLeaderboardCache();
    leaderboardCache.cached = [
      {
        rank: 1,
        userId: 'student-2',
        name: 'Existing Leader',
        level: 1,
        xp: 150,
      },
    ];

    const profilePort = new FakeUserProfilePort([
      { userId: 'student-1', name: 'Quiz Finisher' },
      { userId: 'student-2', name: 'Existing Leader' },
    ]);
    const awardXpService = new AwardXpService(statsRepository);
    const updateStreakService = new UpdateStreakService(statsRepository);
    const gamificationHandler = new GamificationRewardsEventHandler(awardXpService, updateStreakService);
    const leaderboardHandler = new LeaderboardCacheEventHandler(leaderboardCache);
    const getMyRank = new GetMyRankService(statsRepository);
    const getTopRankings = new GetTopRankingsService(statsRepository, leaderboardCache, profilePort);
    const quizPassed = new QuizPassedEvent('student-1', 'quiz-1', 'Math basics', 'attempt-1', 100, 200);

    await dispatchQuizPassed(gamificationHandler, quizPassed);
    await leaderboardHandler.onQuizPassed();

    await expect(getMyRank.execute('student-1')).resolves.toEqual({ rank: 1, xp: 200 });

    const topRankings = await getTopRankings.execute(2);
    expect(topRankings.map((entry) => ({ rank: entry.rank, userId: entry.userId, xp: entry.xp }))).toEqual([
      { rank: 1, userId: 'student-1', xp: 200 },
      { rank: 2, userId: 'student-2', xp: 150 },
    ]);
    expect(leaderboardCache.invalidations).toBe(1);
    expect(leaderboardCache.syncedRankings?.[0]).toMatchObject({
      userId: 'student-1',
      name: 'Quiz Finisher',
      xp: 200,
    });

    await dispatchQuizPassed(gamificationHandler, quizPassed);
    await leaderboardHandler.onQuizPassed();

    const stats = await statsRepository.findByUserId('student-1');
    expect(stats?.toProps()).toMatchObject({
      xp: 200,
      quizzesCompleted: 1,
    });
    await expect(getMyRank.execute('student-1')).resolves.toEqual({ rank: 1, xp: 200 });
    expect(leaderboardCache.invalidations).toBe(2);
  });
});

async function dispatchQuizPassed(
  handler: GamificationRewardsEventHandler,
  event: QuizPassedEvent,
): Promise<void> {
  await (handler as unknown as {
    handleQuizPassed(event: QuizPassedEvent): Promise<void>;
  }).handleQuizPassed(event);
}

class InMemoryUserStatsRepository implements IUserStatsRepository {
  private readonly stats = new Map<string, { id: string; props: UserStatsProps }>();
  private readonly claims = new Set<string>();
  private sequence = 1;

  async seed(userId: string, xp: number): Promise<void> {
    const stats = UserStats.createNew(userId);
    stats.addXp(xp);
    await this.save(stats);
  }

  async findByUserId(userId: string): Promise<UserStats | null> {
    const stored = this.stats.get(userId);
    return stored ? UserStats.fromPersistence(cloneStatsProps(stored.props), stored.id) : null;
  }

  async findOrCreate(userId: string): Promise<UserStats> {
    const existing = await this.findByUserId(userId);
    if (existing) return existing;

    const created = UserStats.createNew(userId);
    await this.save(created);

    return created;
  }

  async save(stats: UserStats): Promise<UserStats> {
    const props = cloneStatsProps(stats.toProps());
    const id = this.stats.get(stats.userId)?.id ?? `stats-${this.sequence++}`;
    this.stats.set(stats.userId, { id, props });

    return UserStats.fromPersistence(cloneStatsProps(props), id);
  }

  async claimXpAward(sourceType: XpAwardSourceType, sourceId: string): Promise<boolean> {
    const key = `${sourceType}:${sourceId}`;
    if (this.claims.has(key)) {
      return false;
    }

    this.claims.add(key);
    return true;
  }

  async findTopByXp(limit: number): Promise<UserStats[]> {
    return Array.from(this.stats.values())
      .sort((left, right) => right.props.xp - left.props.xp)
      .slice(0, limit)
      .map((stored) => UserStats.fromPersistence(cloneStatsProps(stored.props), stored.id));
  }

  async findRankByUserId(userId: string): Promise<number | null> {
    const userStats = this.stats.get(userId);
    if (!userStats) return null;

    const higherXpCount = Array.from(this.stats.values()).filter(
      (stored) => stored.props.xp > userStats.props.xp,
    ).length;

    return higherXpCount + 1;
  }
}

class FakeLeaderboardCache implements ILeaderboardCachePort {
  cached: RankedEntry[] | null = null;
  syncedRankings: RankedEntry[] | null = null;
  invalidations = 0;

  async getTopRankings(limit: number): Promise<RankedEntry[] | null> {
    return this.cached ? this.cached.slice(0, limit) : null;
  }

  async syncRankings(entries: RankedEntry[]): Promise<void> {
    this.syncedRankings = entries.map((entry) => ({ ...entry }));
    this.cached = this.syncedRankings;
  }

  async invalidate(): Promise<void> {
    this.invalidations += 1;
    this.cached = null;
  }
}

class FakeUserProfilePort implements IUserProfilePort {
  constructor(private readonly profiles: UserProfileDto[]) {}

  async findByUserIds(userIds: string[]): Promise<UserProfileDto[]> {
    return this.profiles.filter((profile) => userIds.includes(profile.userId));
  }
}

class CapturingDomainEventPublisher {
  readonly events: Array<{ event: string; payload: unknown }> = [];

  publish(event: string, payload: unknown): void {
    this.events.push({ event, payload });
  }
}

class InMemoryQuizRepository implements IQuizRepository {
  private readonly quizzes: Map<string, Quiz>;

  constructor(quizzes: Quiz[]) {
    this.quizzes = new Map(quizzes.map((quiz) => [quiz.id, quiz]));
  }

  async findById(id: string): Promise<Quiz | null> {
    return this.quizzes.get(id) ?? null;
  }

  async findByLessonId(lessonId: string): Promise<Quiz | null> {
    return Array.from(this.quizzes.values()).find((quiz) => quiz.lessonId === lessonId) ?? null;
  }

  async findAll(): Promise<Quiz[]> {
    return Array.from(this.quizzes.values());
  }

  async create(entity: Quiz): Promise<Quiz> {
    this.quizzes.set(entity.id, entity);
    return entity;
  }

  async update(entity: Quiz): Promise<Quiz> {
    this.quizzes.set(entity.id, entity);
    return entity;
  }
}

class InMemoryQuizAttemptRepository implements IQuizAttemptRepository {
  private readonly attempts = new Map<string, QuizAttempt>();
  private sequence = 1;

  async create(entity: QuizAttempt): Promise<QuizAttempt> {
    const props = cloneAttemptProps(entity.toProps());
    const attempt = QuizAttempt.fromPersistence(props, `attempt-${this.sequence++}`);
    this.attempts.set(attempt.id, attempt);

    return attempt;
  }

  async findByIdAndUser(attemptId: string, userId: string): Promise<QuizAttempt | null> {
    const attempt = this.attempts.get(attemptId);
    return attempt?.userId === userId ? attempt : null;
  }

  async findByUser(userId: string): Promise<QuizAttempt[]> {
    return Array.from(this.attempts.values()).filter((attempt) => attempt.userId === userId);
  }

  async deleteById(attemptId: string): Promise<void> {
    this.attempts.delete(attemptId);
  }
}

function cloneStatsProps(props: UserStatsProps): UserStatsProps {
  return {
    userId: props.userId,
    xp: props.xp,
    level: props.level,
    currentStreak: props.currentStreak,
    highestStreak: props.highestStreak,
    quizzesCompleted: props.quizzesCompleted,
    totalLessonsCompleted: props.totalLessonsCompleted,
    coursesCompleted: props.coursesCompleted,
    lastActiveDate: new Date(props.lastActiveDate),
  };
}

function cloneAttemptProps(props: QuizAttemptProps): QuizAttemptProps {
  return {
    quizId: props.quizId,
    userId: props.userId,
    score: props.score,
    answers: { ...props.answers },
    passed: props.passed,
    startedAt: props.startedAt ? new Date(props.startedAt) : undefined,
    completedAt: props.completedAt ? new Date(props.completedAt) : undefined,
  };
}
