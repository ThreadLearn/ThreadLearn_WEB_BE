import { updateProfileSchema } from './users.validator';

describe('updateProfileSchema', () => {
  it('accepts and trims a first name update', () => {
    expect(updateProfileSchema.parse({ firstName: '  Nguyen  ' })).toEqual({ firstName: 'Nguyen' });
  });

  it('accepts and trims a last name update', () => {
    expect(updateProfileSchema.parse({ lastName: '  Van A  ' })).toEqual({ lastName: 'Van A' });
  });

  it('accepts updates to both names', () => {
    expect(updateProfileSchema.parse({ firstName: 'Nguyen', lastName: 'Van A' })).toEqual({
      firstName: 'Nguyen',
      lastName: 'Van A',
    });
  });

  it.each([{ firstName: '   ' }, { lastName: '   ' }])('rejects empty name values', (payload) => {
    expect(updateProfileSchema.safeParse(payload).success).toBe(false);
  });

  it.each([{ firstName: 'a'.repeat(51) }, { lastName: 'a'.repeat(51) }])(
    'rejects names longer than 50 characters',
    (payload) => {
      expect(updateProfileSchema.safeParse(payload).success).toBe(false);
    }
  );

  it('strips account fields that are not part of the profile whitelist', () => {
    const parsed = updateProfileSchema.parse({
      firstName: 'Nguyen',
      email: 'other@example.com',
      role: 'ADMIN',
      isActive: false,
      isVerified: false,
      password: 'not-allowed',
    });

    expect(parsed).toEqual({ firstName: 'Nguyen' });
  });
});
