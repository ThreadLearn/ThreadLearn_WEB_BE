import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { env } from '../../configs/env';
import { UnauthorizedError } from '../custom-error';

@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization as string | undefined;

    if (!authHeader) return true;

    if (!authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Malformed Authorization header.');
    }

    try {
      request.user = jwt.verify(authHeader.split(' ')[1], env.JWT_ACCESS_SECRET);
    } catch {
      throw new UnauthorizedError('Invalid or expired authentication token.');
    }

    return true;
  }
}
