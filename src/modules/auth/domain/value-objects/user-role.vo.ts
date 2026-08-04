/**
 * Vai trò người dùng (domain). Mirror đúng union trung tâm
 * `UserRole` ở `src/common/decorators/roles.decorator.ts` nhưng KHÔNG import
 * để giữ domain thuần (không kéo theo @nestjs). Source-of-truth cho tầng HTTP
 * vẫn là decorator; đây chỉ là kiểu domain tương đương.
 */
export type UserRole = 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';

export const USER_ROLES: readonly UserRole[] = ['STUDENT', 'INSTRUCTOR', 'ADMIN'];

export const DEFAULT_USER_ROLE: UserRole = 'STUDENT';

export function isUserRole(value: unknown): value is UserRole {
  return value === 'STUDENT' || value === 'INSTRUCTOR' || value === 'ADMIN';
}
