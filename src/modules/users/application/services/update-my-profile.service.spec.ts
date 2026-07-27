import { UserEntity } from '../../../auth/domain/entities/user.entity';
import { IUserRepository } from '../../../auth/domain/interfaces/user.repository';
import { UpdateMyProfileService } from './update-my-profile.service';

describe('UpdateMyProfileService', () => {
  const makeUser = () =>
    UserEntity.fromPersistence({
      id: 'user-1',
      email: 'student@example.com',
      passwordHash: 'hash',
      firstName: 'Old',
      lastName: 'Name',
      avatarUrl: '/uploads/avatar.png',
      role: 'STUDENT',
      isVerified: true,
      isActive: true,
    });

  const makeRepo = (user: UserEntity): jest.Mocked<IUserRepository> =>
    ({
      findById: jest.fn().mockResolvedValue(user),
      updateProfileNames: jest.fn().mockImplementation(async (entity) => entity),
    } as unknown as jest.Mocked<IUserRepository>);

  it('updates only the first name', async () => {
    const user = makeUser();
    const repo = makeRepo(user);
    const service = new UpdateMyProfileService(repo);

    const result = await service.execute({ userId: 'user-1', firstName: 'Nguyen' });

    expect(result).toMatchObject({ firstName: 'Nguyen', lastName: 'Name' });
    expect(repo.updateProfileNames).toHaveBeenCalledWith(user);
  });

  it('updates only the last name', async () => {
    const user = makeUser();
    const service = new UpdateMyProfileService(makeRepo(user));

    const result = await service.execute({ userId: 'user-1', lastName: 'Van A' });

    expect(result).toMatchObject({ firstName: 'Old', lastName: 'Van A' });
  });

  it('updates both names without changing avatar or account fields', async () => {
    const user = makeUser();
    const service = new UpdateMyProfileService(makeRepo(user));

    const result = await service.execute({ userId: 'user-1', firstName: 'Nguyen', lastName: 'Van A' });

    expect(result).toMatchObject({
      firstName: 'Nguyen',
      lastName: 'Van A',
      avatarUrl: '/uploads/avatar.png',
      email: 'student@example.com',
      role: 'STUDENT',
      isActive: true,
      isVerified: true,
    });
  });
});
