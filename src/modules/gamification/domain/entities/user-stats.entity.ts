import { BaseEntity } from '../../../../shared/domain/base.entity';
import { DomainError, ErrorCode } from '../../../../shared/errors/error-codes';
import { calculateLevel } from '../services/level-calculator';

export interface UserStatsProps {
  userId: string;
  xp: number;
  level: number;
  currentStreak: number;
  highestStreak: number;
  quizzesCompleted: number;
  totalLessonsCompleted: number;
  coursesCompleted: number;
  lastActiveDate: Date;
}

export class UserStats extends BaseEntity<UserStatsProps> {
  private constructor(props: UserStatsProps, id?: string) {
    super(props, id);
  }

  // ─── Factories ────────────────────────────────────────────

  static createNew(userId: string, now: Date = new Date()): UserStats {
    const props: UserStatsProps = {
      userId,
      xp: 0,
      level: 1,
      currentStreak: 0,
      highestStreak: 0,
      quizzesCompleted: 0,
      totalLessonsCompleted: 0,
      coursesCompleted: 0,
      lastActiveDate: now,
    };
    UserStats.validate(props);
    return new UserStats(props);
  }

  static fromPersistence(props: UserStatsProps, id: string): UserStats {
    return new UserStats(props, id);
  }

  // ─── Business Rules (XP & Leveling) ───────────────────────

  /** Cấp thêm điểm kinh nghiệm và tính lại cấp độ */
  addXp(amount: number, quizzesCompletedDelta = 0, now: Date = new Date()): void {
    if (amount < 0) throw DomainError.badRequest(ErrorCode.GAMIFICATION_INVALID_XP, 'XP amount cannot be negative');
    
    this.props.xp += amount;
    this.props.quizzesCompleted += quizzesCompletedDelta;
    this.props.level = calculateLevel(this.props.xp);
    this.props.lastActiveDate = now;
  }

  /** Cập nhật chuỗi đăng nhập liên tục */
  updateStreak(now: Date = new Date()): void {
    const lastActive = this.props.lastActiveDate;
    
    // So sánh theo ngày (bỏ qua giờ)
    const diffTime = Math.abs(now.getTime() - lastActive.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      this.props.currentStreak += 1;
      if (this.props.currentStreak > this.props.highestStreak) {
        this.props.highestStreak = this.props.currentStreak;
      }
    } else if (diffDays > 1) {
      this.props.currentStreak = 1;
    } else if (this.props.currentStreak === 0) {
      this.props.currentStreak = 1;
    }

    this.props.lastActiveDate = now;
  }

  /** Đồng bộ lại tiến trình học và cập nhật nếu cần */
  syncProgress(lessonsCompletedCount: number, coursesCompletedCount: number, lessonXp: number, courseXp: number): boolean {
    let changed = false;

    if (this.props.totalLessonsCompleted < lessonsCompletedCount) {
      this.props.totalLessonsCompleted = lessonsCompletedCount;
      changed = true;
    }
    
    if (this.props.coursesCompleted < coursesCompletedCount) {
      this.props.coursesCompleted = coursesCompletedCount;
      changed = true;
    }

    // Đảm bảo không bị tụt XP nếu đã cộng
    const minimumXp = (lessonsCompletedCount * lessonXp) + (coursesCompletedCount * courseXp);
    if (this.props.xp < minimumXp) {
      this.props.xp = minimumXp;
      changed = true;
    }

    if (lessonsCompletedCount > 0 && this.props.currentStreak < 1) {
      this.props.currentStreak = 1;
      this.props.highestStreak = Math.max(this.props.highestStreak, 1);
      changed = true;
    }

    const expectedLevel = calculateLevel(this.props.xp);
    if (this.props.level !== expectedLevel) {
      this.props.level = expectedLevel;
      changed = true;
    }

    return changed;
  }

  // ─── Getters ──────────────────────────────────────────────

  get userId(): string { return this.props.userId; }
  get xp(): number { return this.props.xp; }
  get level(): number { return this.props.level; }
  get currentStreak(): number { return this.props.currentStreak; }
  get highestStreak(): number { return this.props.highestStreak; }

  // ─── Snapshot ─────────────────────────────────────────────

  toProps(): UserStatsProps & { id: string } {
    return {
      id: this.id,
      ...this.props,
    };
  }

  // ─── Validation (private) ────────────────────────────────

  private static validate(props: UserStatsProps): void {
    if (!props.userId) {
      throw DomainError.badRequest(ErrorCode.GAMIFICATION_INVALID_USER, 'User ID cannot be empty.');
    }
  }
}
