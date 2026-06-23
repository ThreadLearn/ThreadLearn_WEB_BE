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
}
