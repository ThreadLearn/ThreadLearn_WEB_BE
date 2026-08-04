export interface AuthenticatedUser {
  id: string;
  email: string;
  role: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}
