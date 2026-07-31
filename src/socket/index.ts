import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { BadRequestError } from '../common/custom-error';
import { User } from '../modules/auth/models/user.model';
import { ILearningAccess, LEARNING_ACCESS } from '../shared/domain/interfaces/learning-access.port';
import { Inject } from '@nestjs/common';
import mongoose from 'mongoose';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../configs/env';
import { logger } from '../configs/logger';

let ioInstance: Server | null = null;

@WebSocketGateway({
  maxHttpBufferSize: 64 * 1024,
  cors: {
    origin: env.FRONTEND_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(@Inject(LEARNING_ACCESS) private readonly learningAccess: ILearningAccess) {}
  @WebSocketServer()
  server!: Server;

  afterInit(server: Server) {
    ioInstance = server;
    server.use(async (socket, next) => {
      const token = socket.handshake.auth?.token;
      if (typeof token !== 'string' || !token) {
        return next(new Error('Authentication token is required.'));
      }
      try {
        const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as {
          id?: string;
          sub?: string;
          tokenType?: string;
          tokenVersion?: number;
        };
        if (payload.tokenType !== 'access') return next(new Error('An access token is required.'));
        const userId = payload.id ?? payload.sub;
        if (!userId) return next(new Error('Authentication token has no user id.'));
        const user = await User.findById(userId).select('role isActive lockedAt lockedUntil tokenVersion').lean();
        const lockedUntil = user?.lockedUntil ? new Date(user.lockedUntil).getTime() : 0;
        if (!user || user.isActive === false || user.lockedAt || lockedUntil > Date.now()) {
          return next(new Error('User account is inactive or locked.'));
        }
        if ((payload.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) {
          return next(new Error('Authentication token has been revoked.'));
        }
        socket.data.userId = String(userId);
        socket.data.userRole = user.role;
        socket.data.tokenVersion = payload.tokenVersion ?? 0;
        socket.data.discussionEvents = [];
        return next();
      } catch {
        return next(new Error('Invalid or expired authentication token.'));
      }
    });
    logger.info('Socket.IO gateway initialized.');
  }

  handleConnection(socket: Socket) {
    logger.info(`Realtime client connected: ${socket.id}`);

    const userId = socket.data.userId as string;
    socket.join(`user:${userId}`);
    logger.info(`Socket ${socket.id} joined its authenticated user room.`);
  }

  handleDisconnect(socket: Socket) {
    logger.info(`Realtime client disconnected: ${socket.id}`);
  }

  @SubscribeMessage('discussion:join')
  async joinDiscussion(
    @ConnectedSocket() socket: Socket,
    @MessageBody()
    payload: { targetType?: 'COURSE' | 'LESSON'; targetId?: string },
  ) {
    this.assertSocketRate(socket);
    const targetType = payload?.targetType;
    const targetId = payload?.targetId;
    if (!targetType || !targetId || !mongoose.isValidObjectId(targetId)) {
      throw new BadRequestError('Invalid discussion room.');
    }
    const userId = String(socket.data.userId);
    const user = await User.findById(userId).select('role isActive lockedAt lockedUntil tokenVersion').lean();
    const lockedUntil = user?.lockedUntil ? new Date(user.lockedUntil).getTime() : 0;
    if (!user || user.isActive === false || user.lockedAt || lockedUntil > Date.now()) {
      throw new BadRequestError('Authenticated user is inactive or locked.');
    }
    if ((socket.data.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) {
      throw new BadRequestError('Authentication token has been revoked.');
    }
    if (targetType === 'COURSE') {
      await this.learningAccess.assertCourseInteractionAccess(targetId, { id: userId, role: user.role });
    } else {
      await this.learningAccess.assertLessonInteractionAccess(targetId, { id: userId, role: user.role });
    }
    socket.join(discussionRoom(targetType, targetId));
    return { ok: true };
  }

  @SubscribeMessage('discussion:leave')
  leaveDiscussion(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { targetType?: 'COURSE' | 'LESSON'; targetId?: string },
  ) {
    this.assertSocketRate(socket);
    if (payload?.targetType && payload.targetId && mongoose.isValidObjectId(payload.targetId)) {
      socket.leave(discussionRoom(payload.targetType, payload.targetId));
    }
    return { ok: true };
  }

  private assertSocketRate(socket: Socket) {
    const now = Date.now();
    const recent = ((socket.data.discussionEvents as number[] | undefined) ?? [])
      .filter((timestamp) => now - timestamp < 60_000);
    if (recent.length >= 20) throw new BadRequestError('Too many realtime room requests.');
    recent.push(now);
    socket.data.discussionEvents = recent;
  }
}

export function getSocketServer() {
  return ioInstance;
}

export const discussionRoom = (targetType: 'COURSE' | 'LESSON', targetId: string) =>
  `discussion:${targetType}:${targetId}`;
