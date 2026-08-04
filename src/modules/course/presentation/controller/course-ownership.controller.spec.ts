import jwt from 'jsonwebtoken';
import { ForbiddenError } from '../../../../common/custom-error';
import { ROLES_KEY } from '../../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import {
  AdminCourseOwnershipController,
  InstructorCoursesController,
} from './course-ownership.controller';

function contextFor(allowedRoles: string[], role: 'ADMIN' | 'INSTRUCTOR' | 'STUDENT') {
  const request = { headers: { authorization: 'Bearer valid-token' } };
  return {
    reflector: { getAllAndOverride: jest.fn().mockReturnValue(allowedRoles) },
    context: {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => undefined,
      getClass: () => undefined,
    },
    request,
    role,
  };
}

describe('Course ownership route authorization', () => {
  afterEach(() => jest.restoreAllMocks());

  it('allows only Admin to assign, reassign, or unassign', () => {
    for (const role of ['ADMIN', 'INSTRUCTOR', 'STUDENT'] as const) {
      const fixture = contextFor(['ADMIN'], role);
      jest.spyOn(jwt, 'verify').mockReturnValue({ id: `${role}-id`, role } as never);
      const action = () => new JwtAuthGuard(fixture.reflector as never).canActivate(fixture.context as never);
      if (role === 'ADMIN') expect(action()).toBe(true);
      else expect(action).toThrow(ForbiddenError);
    }
  });

  it('allows Instructor A and B to call My Courses but denies Student and Admin', () => {
    const cases = [
      { id: 'instructor-a', role: 'INSTRUCTOR' as const, allowed: true },
      { id: 'instructor-b', role: 'INSTRUCTOR' as const, allowed: true },
      { id: 'student', role: 'STUDENT' as const, allowed: false },
      { id: 'admin', role: 'ADMIN' as const, allowed: false },
    ];
    for (const { id, role, allowed } of cases) {
      const fixture = contextFor(['INSTRUCTOR'], role);
      jest.spyOn(jwt, 'verify').mockReturnValue({ id, role } as never);
      const action = () => new JwtAuthGuard(fixture.reflector as never).canActivate(fixture.context as never);
      if (allowed) expect(action()).toBe(true);
      else expect(action).toThrow(ForbiddenError);
    }
  });

  it('keeps assignment and My Courses routes as separate controllers', () => {
    expect(Reflect.getMetadata(ROLES_KEY, AdminCourseOwnershipController)).toEqual(['ADMIN']);
    expect(Reflect.getMetadata(ROLES_KEY, InstructorCoursesController)).toEqual(['INSTRUCTOR']);
  });
});
