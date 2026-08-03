/**
 * Global type extensions for the ThreadLearn application.
 */

export type UserRole = 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';

export interface JWTPayload {
  id: string;
  email: string;
  role: UserRole;
  tokenVersion?: number;
  tokenType?: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
