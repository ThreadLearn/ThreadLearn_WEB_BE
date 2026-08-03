import { UserEntity } from '../../domain/entities/user.entity';
import { IUserRepository } from '../../domain/interfaces/user.repository';
import { GetSessionService } from './get-session.service';

describe('GetSessionService', () => {
  it('returns the persisted instructor role in the authenticated session', async () => {
    const user = UserEntity.fromPersistence({
      id: 'instructor-1', email: 'instructor@example.com', firstName: 'Thread', lastName: 'Instructor',
      passwordHash: 'hash', role: 'INSTRUCTOR', isActive: true, isVerified: true,
    });
    const users = { findById: jest.fn().mockResolvedValue(user) };
    const service = new GetSessionService(users as unknown as IUserRepository);

    await expect(service.execute({ userId: 'instructor-1' })).resolves.toMatchObject({
      user: { id: 'instructor-1', role: 'INSTRUCTOR' },
    });
  });
});
