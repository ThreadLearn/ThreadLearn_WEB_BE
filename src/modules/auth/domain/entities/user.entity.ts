import { UserRole } from '../value-objects/user-role.vo';

/**
 * Toàn bộ trạng thái của 1 User ở góc nhìn Auth (đã tách khỏi Mongoose).
 * `passwordHash` là field nội bộ phục vụ persistence — KHÔNG dựng presenter ở phase này.
 *
 * Lưu ý: model thật còn các field khác (planType, subscriptionExpiresAt, googleId,
 * githubId, failedLoginAttempts, lockedUntil). Phase skeleton này chỉ khai báo
 * tập field tối thiểu cho luồng auth; mapper (DEV1.2) sẽ bổ sung khi cần.
 */
export interface UserProps {
  id: string;
  email: string;
  passwordHash?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  role: UserRole;
  isVerified: boolean;
  emailVerifiedAt?: Date;
  isActive: boolean;
  lockedAt?: Date;
  lockedReason?: string;
  lastLoginAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateUserEntityInput {
  email: string;
  passwordHash?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  role?: UserRole;
  isVerified?: boolean;
}

/**
 * User aggregate (Auth). Chứa business rule về trạng thái tài khoản
 * (verify email, lock/unlock, activate/deactivate). KHÔNG chứa bcrypt/JWT/email —
 * những thứ đó là adapter ở infrastructure.
 */
export class UserEntity {
  private constructor(private readonly props: UserProps) {}

  /** Dựng entity từ dữ liệu đã lưu (mapper gọi). */
  static fromPersistence(props: UserProps): UserEntity {
    return new UserEntity(props);
  }

  /** Tạo user mới; default chưa verify + đang active. Hash password do application/adapter lo. */
  static createNew(input: CreateUserEntityInput): UserEntity {
    const email = (input.email ?? '').trim().toLowerCase();
    if (!email) {
      throw new Error('email is required.');
    }
    return new UserEntity({
      id: '',
      email,
      passwordHash: input.passwordHash,
      firstName: input.firstName?.trim(),
      lastName: input.lastName?.trim(),
      avatarUrl: input.avatarUrl,
      role: input.role ?? 'STUDENT',
      isVerified: input.isVerified ?? false,
      isActive: true,
    });
  }

  get id(): string {
    return this.props.id;
  }
  get email(): string {
    return this.props.email;
  }
  get role(): UserRole {
    return this.props.role;
  }
  get isVerified(): boolean {
    return this.props.isVerified;
  }
  get isActive(): boolean {
    return this.props.isActive;
  }

  /** Đánh dấu email đã xác minh (giữ behavior set `emailVerifiedAt` lần đầu). */
  markEmailVerified(now: Date = new Date()): void {
    this.props.isVerified = true;
    if (!this.props.emailVerifiedAt) {
      this.props.emailVerifiedAt = now;
    }
  }

  /** Khoá tài khoản (mirror admin lock: isActive=false + lockedAt + lockedReason). */
  lock(reason?: string, now: Date = new Date()): void {
    this.props.isActive = false;
    this.props.lockedAt = now;
    this.props.lockedReason = reason;
  }

  /** Mở khoá (mirror admin unlock: isActive=true + clear lockedAt/lockedReason). */
  unlock(): void {
    this.props.isActive = true;
    this.props.lockedAt = undefined;
    this.props.lockedReason = undefined;
  }

  deactivate(): void {
    this.props.isActive = false;
  }

  activate(): void {
    this.props.isActive = true;
  }

  /** Snapshot bất biến cho mapper/presenter (không lộ tham chiếu nội bộ). */
  toProps(): UserProps {
    return { ...this.props };
  }
}
