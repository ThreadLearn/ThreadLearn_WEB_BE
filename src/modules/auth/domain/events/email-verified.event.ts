/**
 * Domain event: user vừa xác minh email thành công.
 */
export class EmailVerifiedEvent {
  static readonly eventName = 'auth.email.verified';

  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
