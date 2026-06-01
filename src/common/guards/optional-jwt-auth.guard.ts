import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Like JwtAuthGuard, but does NOT throw on missing/invalid tokens.
 * Used by UC23 (course detail) and UC25 (lesson view) so Guest can hit
 * the same endpoint while authenticated users get extra context.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<T = any>(_err: unknown, user: T): T {
    return user ?? (null as unknown as T);
  }
}
