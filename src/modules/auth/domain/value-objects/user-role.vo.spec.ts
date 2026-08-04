import { USER_ROLES, isUserRole } from './user-role.vo';

describe('UserRole', () => {
  it('recognises Instructor as a persisted role', () => {
    expect(USER_ROLES).toEqual(['STUDENT', 'INSTRUCTOR', 'ADMIN']);
    expect(isUserRole('INSTRUCTOR')).toBe(true);
    expect(isUserRole('AUTHOR')).toBe(false);
  });
});
