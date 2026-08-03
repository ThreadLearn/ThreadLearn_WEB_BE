import type { AdminSafeUser, StudentListMeta } from './student-management-use-case.dto';

export interface AddInstructorInput {
  adminId: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface AddInstructorResult {
  user: AdminSafeUser;
  passwordSetupEmailSent: boolean;
}

export interface InstructorManagementTargetInput {
  adminId: string;
  instructorId: string;
}

export interface LockInstructorInput extends InstructorManagementTargetInput {
  lockedReason?: string;
}

export interface InstructorManagementResult {
  user: AdminSafeUser;
}

export interface GetInstructorListInput {
  adminId: string;
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
  isVerified?: boolean;
}

export interface GetInstructorListResult {
  instructors: AdminSafeUser[];
  meta: StudentListMeta;
}

export interface UpdateInstructorInfoInput extends InstructorManagementTargetInput {
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  isVerified?: boolean;
}
