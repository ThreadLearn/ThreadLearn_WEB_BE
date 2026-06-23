/**
 * Refresh token (domain thuần).
 *
 * Audit DEV1.0: hệ thống hiện lưu **raw token** (field `token`, unique index + TTL).
 * Phase này KHÔNG đổi behavior sang hashed. `tokenHash` được khai báo optional để
 * chuẩn bị migration tương lai, nhưng chưa dùng.
 */
export interface RefreshTokenProps {
  id: string;
  userId: string;
  /** Raw token — behavior hiện tại. */
  token: string;
  /** Reserved cho migration sau; chưa dùng ở phase này. */
  tokenHash?: string;
  expiresAt: Date;
  revokedAt?: Date;
  createdAt?: Date;
}

export interface CreateRefreshTokenInput {
  userId: string;
  token: string;
  expiresAt: Date;
  tokenHash?: string;
}

export class RefreshTokenEntity {
  private constructor(private readonly props: RefreshTokenProps) {}

  static fromPersistence(props: RefreshTokenProps): RefreshTokenEntity {
    return new RefreshTokenEntity(props);
  }

  static createNew(input: CreateRefreshTokenInput): RefreshTokenEntity {
    if (!input.userId) {
      throw new Error('userId is required.');
    }
    if (!input.token) {
      throw new Error('token is required.');
    }
    return new RefreshTokenEntity({
      id: '',
      userId: input.userId,
      token: input.token,
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
  get token(): string {
    return this.props.token;
  }

  isExpired(now: Date = new Date()): boolean {
    return this.props.expiresAt.getTime() <= now.getTime();
  }

  isRevoked(): boolean {
    return !!this.props.revokedAt;
  }

  revoke(now: Date = new Date()): void {
    if (!this.props.revokedAt) {
      this.props.revokedAt = now;
    }
  }

  toProps(): RefreshTokenProps {
    return { ...this.props };
  }
}
