import { UserEntity } from '../../../auth/domain/entities/user.entity';
import { ProfileUserPresenter } from './profile-user.presenter';

describe('ProfileUserPresenter', () => {
  it('returns the paid entitlement needed to rehydrate an authenticated profile', () => {
    const expiresAt = new Date('2026-12-31T00:00:00.000Z');
    const user = UserEntity.fromPersistence({
      id: 'user-1',
      email: 'student@example.com',
      firstName: 'Student',
      lastName: 'One',
      role: 'STUDENT',
      isVerified: true,
      isActive: true,
      planType: 'PREMIUM',
      subscriptionExpiresAt: expiresAt,
      subscriptionFeatures: ['PREMIUM_COURSES'],
    });

    expect(ProfileUserPresenter.toSafeUser(user)).toMatchObject({
      id: 'user-1',
      planType: 'PREMIUM',
      subscriptionExpiresAt: expiresAt,
      subscriptionFeatures: ['PREMIUM_COURSES'],
    });
  });
});
