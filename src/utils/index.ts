import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';

interface JWTPayload { id: string; email: string; role: string; }

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePasswords(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateRandomToken(length = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}

export function parsePagination(params: URLSearchParams | Record<string, string>) {
  const get = (k: string) => params instanceof URLSearchParams ? (params.get(k) ?? '') : (params[k] ?? '');
  return {
    page:      Math.max(1, parseInt(get('page')  || '1',  10)),
    limit:     Math.min(100, Math.max(1, parseInt(get('limit') || '10', 10))),
    search:    get('search')    || '',
    sortBy:    get('sortBy')    || 'createdAt',
    sortOrder: (get('sortOrder') || 'desc') as 'asc' | 'desc',
  };
}
