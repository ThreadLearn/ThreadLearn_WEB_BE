import { Injectable } from '@nestjs/common';
import { hashPassword, comparePasswords } from '../../../../utils';
import { IPasswordHasher } from '../../domain/interfaces/password-hasher.port';

/**
 * Adapter cho `IPasswordHasher` — wrap bcrypt helper ở `src/utils/index.ts`
 * (`hashPassword` = bcrypt.hash rounds 10, `comparePasswords` = bcrypt.compare).
 * Giữ đúng cost hiện tại của AuthService. KHÔNG log password.
 *
 * Phase DEV1.2: chỉ tạo adapter, CHƯA inject vào application/controller.
 */
@Injectable()
export class BcryptPasswordHasherService implements IPasswordHasher {
  hash(password: string): Promise<string> {
    return hashPassword(password);
  }

  compare(plain: string, hash: string): Promise<boolean> {
    return comparePasswords(plain, hash);
  }
}
