import { AppError } from '../../common/custom-error';

/**
 * Bảng error code dùng chung toàn hệ thống (Phase 1).
 * Mọi lỗi nghiệp vụ nên ném `DomainError` với một mã ở đây thay vì string rời rạc,
 * để FE/đồng đội bắt lỗi theo `code` thay vì so khớp `message`.
 */
export enum ErrorCode {
  // ----- Course (DEV2) -----
  COURSE_NOT_FOUND = 'COURSE_NOT_FOUND',
  COURSE_INVALID_INPUT = 'COURSE_INVALID_INPUT',
  COURSE_NOT_PUBLISHABLE = 'COURSE_NOT_PUBLISHABLE',
  COURSE_RESTORE_WINDOW_EXPIRED = 'COURSE_RESTORE_WINDOW_EXPIRED',

  // ----- Learning access (sẽ dùng ở Phase 2) -----
  LESSON_NOT_FOUND = 'LESSON_NOT_FOUND',
  LESSON_LOCKED = 'LESSON_LOCKED',
  PREMIUM_REQUIRED = 'PREMIUM_REQUIRED',
  NOT_ENROLLED = 'NOT_ENROLLED',
  ALREADY_ENROLLED = 'ALREADY_ENROLLED',
  COURSE_PREREQUISITE_REQUIRED = 'COURSE_PREREQUISITE_REQUIRED',

  // ----- Lesson (DEV2 — Phase 3) -----
  LESSON_INVALID_INPUT = 'LESSON_INVALID_INPUT',

  // ----- Enrollment (DEV2 — Phase 3) -----
  COURSE_ACCESS_DENIED = 'COURSE_ACCESS_DENIED',
  COURSE_HAS_NO_LESSONS = 'COURSE_HAS_NO_LESSONS',
  ENROLLMENT_NOT_FOUND = 'ENROLLMENT_NOT_FOUND',

  // ----- Quiz (DEV4 — B1) -----
  QUIZ_NOT_FOUND = 'QUIZ_NOT_FOUND',
  QUIZ_INVALID_INPUT = 'QUIZ_INVALID_INPUT',
  QUIZ_ALREADY_EXISTS = 'QUIZ_ALREADY_EXISTS',
  QUESTION_NOT_FOUND = 'QUESTION_NOT_FOUND',
  QUIZ_MIN_QUESTIONS = 'QUIZ_MIN_QUESTIONS',

  // ----- Gamification (DEV4 — B3) -----
  GAMIFICATION_INVALID_XP = 'GAMIFICATION_INVALID_XP',
  GAMIFICATION_INVALID_USER = 'GAMIFICATION_INVALID_USER',

  // ----- Subscription (DEV4 — B5) -----
  SUBSCRIPTION_PLAN_NOT_FOUND = 'SUBSCRIPTION_PLAN_NOT_FOUND',
  SUBSCRIPTION_PLAN_INVALID_INPUT = 'SUBSCRIPTION_PLAN_INVALID_INPUT',
  SUBSCRIPTION_PLAN_ALREADY_EXISTS = 'SUBSCRIPTION_PLAN_ALREADY_EXISTS',
  SUBSCRIPTION_PURCHASE_NOT_FOUND = 'SUBSCRIPTION_PURCHASE_NOT_FOUND',
  SUBSCRIPTION_PURCHASE_INVALID_INPUT = 'SUBSCRIPTION_PURCHASE_INVALID_INPUT',
  SUBSCRIPTION_PAYMENT_INVALID = 'SUBSCRIPTION_PAYMENT_INVALID',
}

/**
 * Lỗi nghiệp vụ có mã ổn định. Kế thừa `AppError` nên `GlobalExceptionFilter`
 * xử lý y hệt các lỗi cũ — chỉ thêm `code` vào response.
 */
export class DomainError extends AppError {
  constructor(statusCode: number, code: ErrorCode, message: string, errors: any[] | null = null) {
    super(message, statusCode, errors, code);
  }

  static badRequest(code: ErrorCode, message: string, errors: any[] | null = null): DomainError {
    return new DomainError(400, code, message, errors);
  }
  static forbidden(code: ErrorCode, message: string): DomainError {
    return new DomainError(403, code, message);
  }
  static notFound(code: ErrorCode, message: string): DomainError {
    return new DomainError(404, code, message);
  }
  static conflict(code: ErrorCode, message: string): DomainError {
    return new DomainError(409, code, message);
  }
}
