import { UserEntity } from '../entities/user.entity';

/**
 * Query liệt kê student (UC12 — admin student management). Ngôn ngữ domain thuần
 * (KHÔNG `FilterQuery`/Mongoose). Adapter map sang filter `role:'STUDENT'` + search/isActive/isVerified.
 */
export interface StudentListQuery {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
  isVerified?: boolean;
}

/**
 * Kết quả liệt kê student dạng domain (Entity + pagination thuần). KHÔNG chứa
 * presentation (ApiResponse/meta wrapper) — presenter/use-case lo ở tầng trên.
 */
export interface StudentListResult {
  students: UserEntity[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * PORT: hợp đồng truy cập dữ liệu User (ngôn ngữ domain). Nhận/trả Entity,
 * KHÔNG biết Mongoose, KHÔNG trả document thô. Adapter (infrastructure) hiện thực.
 */
export interface IUserRepository {
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  /** Google ID còn tồn tại trong model hiện tại (sparse unique). */
  findByGoogleId(googleId: string): Promise<UserEntity | null>;
  create(entity: UserEntity): Promise<UserEntity>;
  update(entity: UserEntity): Promise<UserEntity>;
  /** Persist only the fields mutable through UC09 PATCH `/users/profile`. */
  updateProfileNames(entity: UserEntity): Promise<UserEntity>;
  updateEmailVerificationState(entity: UserEntity): Promise<UserEntity>;
  updateLastLogin(userId: string, date: Date): Promise<void>;
  /**
   * Persist trạng thái bảo mật đăng nhập (lockout): `failedLoginAttempts`,
   * `lockedUntil` (clear bằng `$unset` khi entity không còn lockedUntil) và
   * `lastLoginAt`. Tách riêng để clear field đúng cách (mapper strip-undefined
   * không tự `$unset`). Nhận/trả Entity — KHÔNG dùng FilterQuery/UpdateQuery ở port.
   */
  updateLoginSecurityState(entity: UserEntity): Promise<UserEntity>;
  /**
   * Liệt kê student (UC12). Mirror legacy `AdminService.listStudents`:
   * filter `role:'STUDENT'` + optional `isActive`/`isVerified` + search regex
   * (email/firstName/lastName), sort `createdAt:-1`, skip/limit theo page.
   * Trả `StudentListResult` (Entity[] + pagination) — KHÔNG trả doc thô.
   */
  listStudents(query: StudentListQuery): Promise<StudentListResult>;
  /**
   * Persist mutation admin student management (UC11 lock/unlock, UC13 update).
   * Tách riêng `update` thường vì cần `$unset` rõ ràng cho field clearable
   * (`lockedAt`/`lockedReason` khi unlock, `emailVerifiedAt` khi set unverified) —
   * mapper strip-undefined KHÔNG tự `$unset`. KHÔNG đụng `lockedUntil`/`failedLoginAttempts`/
   * `passwordHash`/`googleId`/`planType`. Nhận/trả Entity.
   */
  updateStudentManagementState(entity: UserEntity): Promise<UserEntity>;
}

/** DI token cho `IUserRepository`. */
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
