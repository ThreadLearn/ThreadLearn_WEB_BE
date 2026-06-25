import { Injectable } from '@nestjs/common';
import { User } from '../../models/user.model';
import { UserEntity } from '../../domain/entities/user.entity';
import { IUserRepository } from '../../domain/interfaces/user.repository';
import { UserMapper } from '../mapper/user.mapper';

/**
 * Adapter Mongoose cho `IUserRepository`. Nơi DUY NHẤT (cùng các repo auth khác)
 * import model User. Luôn trả `UserEntity`/null — KHÔNG trả document thô.
 *
 * Phase DEV1.2: chỉ tạo adapter, CHƯA wire vào AuthModule/runtime.
 */
@Injectable()
export class MongoUserRepository implements IUserRepository {
  async findById(id: string): Promise<UserEntity | null> {
    const doc = await User.findById(id);
    return doc ? UserMapper.toEntity(doc) : null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const doc = await User.findOne({ email });
    return doc ? UserMapper.toEntity(doc) : null;
  }

  async findByGoogleId(googleId: string): Promise<UserEntity | null> {
    const doc = await User.findOne({ googleId });
    return doc ? UserMapper.toEntity(doc) : null;
  }

  async create(entity: UserEntity): Promise<UserEntity> {
    const doc = await User.create(UserMapper.toPersistence(entity));
    return UserMapper.toEntity(doc);
  }

  async update(entity: UserEntity): Promise<UserEntity> {
    const doc = await User.findByIdAndUpdate(entity.id, UserMapper.toPersistence(entity), {
      new: true,
    });
    return UserMapper.toEntity(doc!);
  }

  async updateLastLogin(userId: string, date: Date): Promise<void> {
    await User.updateOne({ _id: userId }, { lastLoginAt: date });
  }

  /**
   * Persist trạng thái lockout. `lockedUntil` được `$set` khi còn hạn hoặc `$unset`
   * khi entity đã clear (login thành công) — tránh việc mapper strip-undefined bỏ
   * sót, dẫn tới khoá "dính" mãi. `failedLoginAttempts` luôn `$set`; `lastLoginAt`
   * `$set` khi có giá trị.
   */
  async updateLoginSecurityState(entity: UserEntity): Promise<UserEntity> {
    const p = entity.toProps();
    const set: Record<string, unknown> = {
      failedLoginAttempts: p.failedLoginAttempts ?? 0,
    };
    if (p.lastLoginAt) {
      set.lastLoginAt = p.lastLoginAt;
    }

    const update: Record<string, unknown> = { $set: set };
    if (p.lockedUntil) {
      set.lockedUntil = p.lockedUntil;
    } else {
      update.$unset = { lockedUntil: '' };
    }

    const doc = await User.findByIdAndUpdate(entity.id, update, { new: true });
    return UserMapper.toEntity(doc!);
  }
}
