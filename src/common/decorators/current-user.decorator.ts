import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface JwtPayload {
  id: string;
  email: string;
  role: 'STUDENT' | 'ADMIN';
}

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): JwtPayload => {
    return ctx.switchToHttp().getRequest().user;
  },
);
