/**
 * Domain event: user vừa đăng ký thành công (chưa verify email).
 * Dùng để kích hoạt side-effect (gửi verification email, tạo UserStats…) qua
 * event handler ở Phase sau — KHÔNG gọi trực tiếp trong use-case.
 */
export class UserRegisteredEvent {
  static readonly eventName = 'auth.user.registered';

  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
