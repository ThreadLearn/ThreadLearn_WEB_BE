import jwt from 'jsonwebtoken';
import { env } from '../configs/env';
import { User } from '../modules/auth/models/user.model';
import { ILearningAccess } from '../shared/domain/interfaces/learning-access.port';
import { SocketGateway } from './index';

describe('SocketGateway security boundary', () => {
  let access: jest.Mocked<ILearningAccess>;
  let gateway: SocketGateway;
  let middleware: (socket: any, next: (error?: Error) => void) => Promise<void>;

  beforeEach(() => {
    jest.restoreAllMocks();
    access = {
      checkLessonAccess: jest.fn(), assertLessonAccess: jest.fn(), assertLessonViewAccess: jest.fn(),
      assertLessonInteractionAccess: jest.fn(), assertCourseInteractionAccess: jest.fn(), touchLessonCursor: jest.fn(),
    } as any;
    gateway = new SocketGateway(access);
    const server = { use: jest.fn((handler) => { middleware = handler; }) };
    gateway.afterInit(server as any);
  });

  const authenticate = async (token?: string) => {
    const next = jest.fn();
    await middleware({ handshake: { auth: { token } }, data: {} }, next);
    return next;
  };

  it('rejects a missing, expired, or non-access JWT', async () => {
    expect((await authenticate()).mock.calls[0][0]).toBeInstanceOf(Error);
    const expired = jwt.sign({ id: '507f1f77bcf86cd799439011', tokenType: 'access' }, env.JWT_ACCESS_SECRET, { expiresIn: -1 });
    expect((await authenticate(expired)).mock.calls[0][0].message).toMatch(/Invalid or expired/);
    const refreshType = jwt.sign({ id: '507f1f77bcf86cd799439011', tokenType: 'refresh' }, env.JWT_ACCESS_SECRET);
    expect((await authenticate(refreshType)).mock.calls[0][0].message).toMatch(/access token/i);
  });

  it('rejects an inactive or locked user before joining the private user room', async () => {
    jest.spyOn(User, 'findById').mockReturnValue({
      select: () => ({ lean: async () => ({ role: 'STUDENT', isActive: false }) }),
    } as any);
    const token = jwt.sign({ id: '507f1f77bcf86cd799439011', tokenType: 'access' }, env.JWT_ACCESS_SECRET);
    expect((await authenticate(token)).mock.calls[0][0].message).toMatch(/inactive or locked/i);
  });

  it('rejects a token version revoked after issuance', async () => {
    jest.spyOn(User, 'findById').mockReturnValue({
      select: () => ({ lean: async () => ({ role: 'STUDENT', isActive: true, tokenVersion: 2 }) }),
    } as any);
    const token = jwt.sign(
      { id: '507f1f77bcf86cd799439011', tokenType: 'access', tokenVersion: 1 },
      env.JWT_ACCESS_SECRET,
    );
    expect((await authenticate(token)).mock.calls[0][0].message).toMatch(/revoked/i);
  });

  it('checks room ACL on every discussion join', async () => {
    jest.spyOn(User, 'findById').mockReturnValue({
      select: () => ({ lean: async () => ({ role: 'STUDENT', isActive: true }) }),
    } as any);
    access.assertCourseInteractionAccess.mockRejectedValue(new Error('forbidden'));
    const socket = {
      data: { userId: '507f1f77bcf86cd799439011', discussionEvents: [] },
      join: jest.fn(),
    };
    await expect(gateway.joinDiscussion(socket as any, {
      targetType: 'COURSE', targetId: '507f1f77bcf86cd799439012',
    })).rejects.toThrow('forbidden');
    expect(socket.join).not.toHaveBeenCalled();
  });

  it('checks lesson ACL and the current token version again when joining', async () => {
    jest.spyOn(User, 'findById').mockReturnValue({
      select: () => ({ lean: async () => ({ role: 'STUDENT', isActive: true, tokenVersion: 1 }) }),
    } as any);
    const socket = {
      data: { userId: '507f1f77bcf86cd799439011', tokenVersion: 0, discussionEvents: [] },
      join: jest.fn(),
    };
    await expect(gateway.joinDiscussion(socket as any, {
      targetType: 'LESSON', targetId: '507f1f77bcf86cd799439012',
    })).rejects.toThrow(/revoked/i);
    expect(access.assertLessonInteractionAccess).not.toHaveBeenCalled();
    expect(socket.join).not.toHaveBeenCalled();
  });

  it('rate limits repeated join/leave room requests', () => {
    const socket = { data: { discussionEvents: Array.from({ length: 20 }, () => Date.now()) } };
    expect(() => (gateway as any).assertSocketRate(socket)).toThrow(/Too many realtime room requests/);
  });

  it('only joins the authenticated user room selected by the server', () => {
    const socket = { data: { userId: '507f1f77bcf86cd799439011' }, join: jest.fn(), id: 'socket-1' };
    gateway.handleConnection(socket as any);
    expect(socket.join).toHaveBeenCalledWith('user:507f1f77bcf86cd799439011');
  });
});
