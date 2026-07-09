/**
 * Email verification token (domain thuần).
 * Token chỉ lưu dạng `tokenHash` (sha256) — khớp behavior model hiện tại.
 * Raw token chỉ tồn tại trong link email, KHÔNG lưu DB, KHÔNG log.
 */
export interface EmailVerificationTokenProps {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateEmailVerificationTokenInput {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export class EmailVerificationTokenEntity {
  private constructor(private readonly props: EmailVerificationTokenProps) {}

  static fromPersistence(props: EmailVerificationTokenProps): EmailVerificationTokenEntity {
    return new EmailVerificationTokenEntity(props);
  }

  static createNew(input: CreateEmailVerificationTokenInput): EmailVerificationTokenEntity {
    if (!input.userId) {
      throw new Error('userId is required.');
    }
    if (!input.tokenHash) {
      throw new Error('tokenHash is required.');
    }
    return new EmailVerificationTokenEntity({
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

  toProps(): EmailVerificationTokenProps {
    return { ...this.props };
  }
}
