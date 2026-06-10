import { ForbiddenError } from '../../../common/custom-error';

export type SafeUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  role: 'STUDENT' | 'ADMIN';
  isVerified?: boolean;
  isActive?: boolean;
  lastLoginAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
};

type SanitizableUser = {
  _id?: unknown;
  id?: unknown;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  role: 'STUDENT' | 'ADMIN';
  isVerified?: boolean;
  isActive?: boolean;
  lockedAt?: Date | null;
  lastLoginAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
};

export function sanitizeUser(user: SanitizableUser): SafeUser {
  const id = user._id?.toString() || user.id?.toString() || '';

  return {
    id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl,
    role: user.role,
    isVerified: user.isVerified,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function assertUserCanAuthenticate(user: { isActive?: boolean; lockedAt?: Date | null }) {
  if (user.isActive === false) {
    throw new ForbiddenError('User account is inactive.');
  }

  if (user.lockedAt) {
    throw new ForbiddenError('User account is locked.');
  }
}
