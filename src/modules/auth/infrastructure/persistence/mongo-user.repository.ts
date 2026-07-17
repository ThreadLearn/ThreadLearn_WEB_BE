import { Injectable } from '@nestjs/common';
import { User } from '../../models/user.model';
import { UserEntity } from '../../domain/entities/user.entity';
import {
  IUserRepository,
  StudentListQuery,
  StudentListResult,
} from '../../domain/interfaces/user.repository';
import { UserMapper } from '../mapper/user.mapper';

/** Escape regex (mirror legacy `AdminService.escapeRegex`) — chống ReDoS/ký tự đặc biệt trong search. */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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

  async updateEmailVerificationState(entity: UserEntity): Promise<UserEntity> {
    const p = entity.toProps();
    const set: Record<string, unknown> = {
      isVerified: p.isVerified,
    };
    const unset: Record<string, string> = {};

    if (p.emailVerifiedAt !== undefined) set.emailVerifiedAt = p.emailVerifiedAt;
    else unset.emailVerifiedAt = '';
    if (p.emailVerificationCodeHash !== undefined) set.emailVerificationCodeHash = p.emailVerificationCodeHash;
    else unset.emailVerificationCodeHash = '';
    if (p.emailVerificationCodeExpiresAt !== undefined) {
      set.emailVerificationCodeExpiresAt = p.emailVerificationCodeExpiresAt;
    } else {
      unset.emailVerificationCodeExpiresAt = '';
    }
    if (p.emailVerificationCodeAttempts !== undefined) set.emailVerificationCodeAttempts = p.emailVerificationCodeAttempts;
    else unset.emailVerificationCodeAttempts = '';
    if (p.emailVerificationLastSentAt !== undefined) set.emailVerificationLastSentAt = p.emailVerificationLastSentAt;
    else unset.emailVerificationLastSentAt = '';

    const update: Record<string, unknown> = { $set: set };
    if (Object.keys(unset).length > 0) update.$unset = unset;

    const doc = await User.findByIdAndUpdate(entity.id, update, { new: true });
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

  /**
   * Liệt kê student (UC12). Mirror legacy `AdminService.listStudents`: filter
   * `role:'STUDENT'` + optional `isActive`/`isVerified`, search regex (escape) trên
   * `$or:[email,firstName,lastName]`, sort `createdAt:-1`, skip/limit theo page.
   * Trả `UserEntity[]` qua mapper — KHÔNG trả doc thô, KHÔNG lộ `passwordHash` (presenter lo).
   */
  async listStudents(query: StudentListQuery): Promise<StudentListResult> {
    const filter: Record<string, unknown> = { role: 'STUDENT' };
    if (query.isActive !== undefined) filter.isActive = query.isActive;
    if (query.isVerified !== undefined) filter.isVerified = query.isVerified;
    if (query.search) {
      const searchRegex = new RegExp(escapeRegex(query.search), 'i');
      filter.$or = [{ email: searchRegex }, { firstName: searchRegex }, { lastName: searchRegex }];
    }

    const skip = (query.page - 1) * query.limit;
    const [docs, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit),
      User.countDocuments(filter),
    ]);

    return {
      students: docs.map((doc) => UserMapper.toEntity(doc)),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  /**
   * Persist mutation admin student management (UC11 lock/unlock, UC13 update).
   * Dùng `$set`/`$unset` rõ ràng: clear `lockedAt`/`lockedReason` (unlock) và
   * `emailVerifiedAt` (set unverified) bằng `$unset` vì mapper strip-undefined không tự `$unset`.
   * CHỈ chạm tập field student-management; KHÔNG đụng `lockedUntil`/`failedLoginAttempts`/
   * `passwordHash`/`googleId`/`planType`/`lastLoginAt`.
   */
  async updateStudentManagementState(entity: UserEntity): Promise<UserEntity> {
    const p = entity.toProps();
    const set: Record<string, unknown> = {
      firstName: p.firstName,
      lastName: p.lastName,
      role: p.role,
      isActive: p.isActive,
      isVerified: p.isVerified,
    };
    const unset: Record<string, string> = {};

    // avatarUrl: chỉ `$set` khi có (legacy update không bao giờ clear avatar); KHÔNG `$unset`.
    if (p.avatarUrl !== undefined) set.avatarUrl = p.avatarUrl;

    // emailVerifiedAt / lockedAt / lockedReason: clearable ⇒ `$set` khi có, `$unset` khi entity clear.
    if (p.emailVerifiedAt !== undefined) set.emailVerifiedAt = p.emailVerifiedAt;
    else unset.emailVerifiedAt = '';
    if (p.lockedAt !== undefined) set.lockedAt = p.lockedAt;
    else unset.lockedAt = '';
    if (p.lockedReason !== undefined) set.lockedReason = p.lockedReason;
    else unset.lockedReason = '';

    const update: Record<string, unknown> = { $set: set };
    if (Object.keys(unset).length > 0) update.$unset = unset;

    const doc = await User.findByIdAndUpdate(entity.id, update, { new: true });
    return UserMapper.toEntity(doc!);
  }
}
