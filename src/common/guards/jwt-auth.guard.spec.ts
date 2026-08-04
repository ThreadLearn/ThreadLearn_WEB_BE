import jwt from 'jsonwebtoken';
import { ForbiddenError } from '../custom-error';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  afterEach(() => jest.restoreAllMocks());

  it('denies an instructor when an endpoint only permits ADMIN', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['ADMIN']) };
    const request = { headers: { authorization: 'Bearer valid-token' } };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => undefined,
      getClass: () => undefined,
    };
    jest.spyOn(jwt, 'verify').mockReturnValue({ id: 'instructor-1', role: 'INSTRUCTOR' } as never);

    expect(() => new JwtAuthGuard(reflector as never).canActivate(context as never)).toThrow(ForbiddenError);
  });
});
