import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import jwt from 'jsonwebtoken';
import { env } from '../../configs/env';
import { ForbiddenError, UnauthorizedError } from '../custom-error';
import { ROLES_KEY, UserRole } from '../decorators/roles.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization as string | undefined;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or malformed Authorization header.');
    }

    try {
      request.user = jwt.verify(authHeader.split(' ')[1], env.JWT_ACCESS_SECRET);
    } catch {
      throw new UnauthorizedError('Invalid or expired authentication token.');
    }

    const allowedRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (allowedRoles?.length && !allowedRoles.includes(request.user.role)) {
      throw new ForbiddenError('You do not have permission to access this resource.');
    }

    return true;
  }
}
