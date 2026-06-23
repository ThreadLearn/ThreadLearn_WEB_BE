/**
 * Domain event: user yêu cầu reset mật khẩu.
 *
 * CAVEAT bảo mật: event KHÔNG mang raw token. Việc sinh/gửi token thuộc về
 * application/adapter; nếu handler cần gửi email reset, nó tự sinh token qua port
 * và TUYỆT ĐỐI không log token.
 */
export class PasswordResetRequestedEvent {
  static readonly eventName = 'auth.password-reset.requested';

  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
