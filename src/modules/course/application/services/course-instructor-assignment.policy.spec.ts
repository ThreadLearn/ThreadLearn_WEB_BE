import { BadRequestError, NotFoundError } from '../../../../common/custom-error';
import { UserEntity } from '../../../auth/domain/entities/user.entity';
import { IUserRepository } from '../../../auth/domain/interfaces/user.repository';
import { CourseInstructorAssignmentPolicy } from './course-instructor-assignment.policy';

const id = '507f1f77bcf86cd799439011';

function user(role: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN', overrides: Record<string, unknown> = {}) {
  return UserEntity.fromPersistence({
    id,
    email: 'user@example.test',
    passwordHash: 'hash',
    role,
    isActive: true,
    isVerified: true,
    ...overrides,
  });
}

describe('CourseInstructorAssignmentPolicy', () => {
  const userRepo = { findById: jest.fn() };
  const policy = new CourseInstructorAssignmentPolicy(userRepo as unknown as IUserRepository);

  beforeEach(() => jest.resetAllMocks());

  it('normalizes an omitted or null owner to unassigned', async () => {
    await expect(policy.resolveInstructorId()).resolves.toBeUndefined();
    await expect(policy.resolveInstructorId(null)).resolves.toBeUndefined();
    expect(userRepo.findById).not.toHaveBeenCalled();
  });

  it('allows only active unlocked Instructor accounts', async () => {
    userRepo.findById.mockResolvedValue(user('INSTRUCTOR'));
    await expect(policy.resolveInstructorId(id)).resolves.toBe(id);

    userRepo.findById.mockResolvedValue(user('STUDENT'));
    await expect(policy.resolveInstructorId(id)).rejects.toBeInstanceOf(BadRequestError);
    userRepo.findById.mockResolvedValue(user('ADMIN'));
    await expect(policy.resolveInstructorId(id)).rejects.toBeInstanceOf(BadRequestError);
    userRepo.findById.mockResolvedValue(user('INSTRUCTOR', { isActive: false, lockedAt: new Date() }));
    await expect(policy.resolveInstructorId(id)).rejects.toBeInstanceOf(BadRequestError);
    userRepo.findById.mockResolvedValue(null);
    await expect(policy.resolveInstructorId(id)).rejects.toBeInstanceOf(NotFoundError);
  });
});
