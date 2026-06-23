/**
 * Password reset token (domain thuần).
 * Token chỉ lưu dạng `tokenHash` (sha256) — khớp behavior model hiện tại.
 * Raw token chỉ tồn tại trong link email, KHÔNG lưu DB, KHÔNG log.
 */
export interface PasswordResetTokenProps {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreatePasswordResetTokenInput {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export class PasswordResetTokenEntity {
  private constructor(private readonly props: PasswordResetTokenProps) {}

  static fromPersistence(props: PasswordResetTokenProps): PasswordResetTokenEntity {
    return new PasswordResetTokenEntity(props);
  }

  static createNew(input: CreatePasswordResetTokenInput): PasswordResetTokenEntity {
    if (!input.userId) {
      throw new Error('userId is required.');
    }
    if (!input.tokenHash) {
      throw new Error('tokenHash is required.');
    }
    return new PasswordResetTokenEntity({
      id: '',
      userId: input.userId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
    });
  }

  get id(): string {
    return this.props.id;
  }
  get userId(): string {
    return this.props.userId;
  }

  isExpired(now: Date = new Date()): boolean {
    return this.props.expiresAt.getTime() <= now.getTime();
  }

  isUsed(): boolean {
    return !!this.props.usedAt;
  }

  markUsed(now: Date = new Date()): void {
    if (!this.props.usedAt) {
      this.props.usedAt = now;
    }
  }

  toProps(): PasswordResetTokenProps {
    return { ...this.props };
  }
}
