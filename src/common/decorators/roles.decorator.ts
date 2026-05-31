import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: ('STUDENT' | 'ADMIN')[]) =>
  SetMetadata(ROLES_KEY, roles);
