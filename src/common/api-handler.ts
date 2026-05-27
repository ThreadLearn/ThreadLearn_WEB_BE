export interface AuthenticatedUser {
  id: string;
  email: string;
  role: 'STUDENT' | 'ADMIN';
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}
