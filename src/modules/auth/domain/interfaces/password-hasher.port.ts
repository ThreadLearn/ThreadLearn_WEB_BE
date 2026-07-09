/**
 * PORT: băm/so khớp mật khẩu. Domain/application chỉ biết interface này;
 * adapter (infrastructure) sẽ wrap bcrypt qua `src/utils/index.ts`.
 */
export interface IPasswordHasher {
  hash(password: string): Promise<string>;
  compare(plain: string, hash: string): Promise<boolean>;
}

/** DI token cho `IPasswordHasher`. */
export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');
