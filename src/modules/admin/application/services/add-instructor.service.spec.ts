import { UserEntity } from '../../../auth/domain/entities/user.entity';
import { AddInstructorService } from './add-instructor.service';

const createUser = (overrides: Partial<ReturnType<UserEntity['toProps']>> = {}) =>
  UserEntity.fromPersistence({
    id: 'user-id',
    email: 'user@threadlearn.com',
    firstName: 'Thread',
    lastName: 'Learn',
    role: 'ADMIN',
    isVerified: true,
    isActive: true,
    ...overrides,
  });

describe('AddInstructorService', () => {
  it('creates a verified Instructor and sends a password setup email', async () => {
    const admin = createUser({ id: 'admin-id' });
    const userRepo = {
      findById: jest.fn().mockResolvedValue(admin),
      findByEmail: jest.fn().mockResolvedValue(null),
      create: jest
        .fn()
        .mockImplementation(async (entity: UserEntity) =>
          UserEntity.fromPersistence({ ...entity.toProps(), id: 'instructor-id' })
        ),
    };
    const passwordHasher = { hash: jest.fn().mockResolvedValue('hashed-password') };
    const statsProvisioner = { ensureForUser: jest.fn().mockResolvedValue(undefined) };
    const forgotPasswordService = { execute: jest.fn().mockResolvedValue({ success: true }) };
    const service = new AddInstructorService(
      userRepo as never,
      passwordHasher as never,
      statsProvisioner,
      forgotPasswordService as never
    );

    const result = await service.execute({
      adminId: 'admin-id',
      email: 'instructor@threadlearn.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
    });

    expect(result.user.role).toBe('INSTRUCTOR');
    expect(result.user.isVerified).toBe(true);
    expect(result.passwordSetupEmailSent).toBe(true);
    expect(passwordHasher.hash).toHaveBeenCalledWith(expect.any(String));
    expect(statsProvisioner.ensureForUser).toHaveBeenCalledWith('instructor-id');
    expect(forgotPasswordService.execute).toHaveBeenCalledWith({
      email: 'instructor@threadlearn.com',
    });
  });
});
