import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import jwt from 'jsonwebtoken';
import { env } from '../../configs/env';
import { User } from '../../modules/auth/models/user.model';
import { assertUserCanAuthenticate } from '../../modules/auth/utils/user-sanitizer';
import { ForbiddenError, UnauthorizedError } from '../custom-error';
import { ROLES_KEY, UserRole } from '../decorators/roles.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization as string | undefined;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or malformed Authorization header.');
    }

    let decoded: any;
    try {
      decoded = jwt.verify(authHeader.split(' ')[1], env.JWT_ACCESS_SECRET);
    } catch {
      throw new UnauthorizedError('Invalid or expired authentication token.');
    }

    if (!decoded || typeof decoded === 'string' || !decoded.id) {
      throw new UnauthorizedError('Invalid authentication token payload.');
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      throw new UnauthorizedError('Authenticated user no longer exists.');
    }

    assertUserCanAuthenticate(user);

    request.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    };

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
