import type { UserRole } from '../../../auth/domain/value-objects/user-role.vo';

export type AdminSafeUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  role: UserRole;
  isVerified?: boolean;
  isActive?: boolean;
  lastLoginAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
};

export interface StudentListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AddStudentInput {
  adminId: string;
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
}

export interface AddStudentResult {
  user: AdminSafeUser;
  temporaryPasswordSent: boolean;
}

export interface LockStudentInput {
  adminId: string;
  studentId: string;
  lockedReason?: string;
}

export interface LockStudentResult {
  user: AdminSafeUser;
}

export interface UnlockStudentInput {
  adminId: string;
  studentId: string;
}

export interface UnlockStudentResult {
  user: AdminSafeUser;
}

export interface GetStudentListInput {
  adminId: string;
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
  isVerified?: boolean;
}

export interface GetStudentListResult {
  students: AdminSafeUser[];
  meta: StudentListMeta;
}

export interface UpdateStudentInfoInput {
  adminId: string;
  studentId: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  isVerified?: boolean;
}

export interface UpdateStudentInfoResult {
  user: AdminSafeUser;
}
