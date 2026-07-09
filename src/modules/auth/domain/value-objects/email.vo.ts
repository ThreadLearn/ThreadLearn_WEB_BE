/**
 * Email value-object (domain thuần). Validate format cơ bản + normalize
 * (trim + lowercase) để khớp behavior model (`lowercase: true, trim: true`).
 * KHÔNG dùng class-validator, KHÔNG import NestJS.
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class Email {
  private constructor(private readonly value: string) {}

  /** Tạo Email đã chuẩn hoá; ném lỗi nếu format không hợp lệ. */
  static create(raw: string): Email {
    const normalized = Email.normalize(raw);
    if (!EMAIL_REGEX.test(normalized)) {
      throw new Error('Invalid email format.');
    }
    return new Email(normalized);
  }

  static isValid(raw: string): boolean {
    return EMAIL_REGEX.test(Email.normalize(raw));
  }

  static normalize(raw: string): string {
    return (raw ?? '').trim().toLowerCase();
  }

  getValue(): string {
    return this.value;
  }

  equals(other: Email): boolean {
    return other instanceof Email && other.value === this.value;
  }

  toString(): string {
    return this.value;
  }
}
