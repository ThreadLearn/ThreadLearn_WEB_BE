import {
  ConnectedSocket,
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
    server.use((socket, next) => {
      const token = socket.handshake.auth?.token;
      if (typeof token !== 'string' || !token) {
        return next(new Error('Authentication token is required.'));
      }
      try {
        const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as { id?: string; sub?: string };
        const userId = payload.id ?? payload.sub;
        if (!userId) return next(new Error('Authentication token has no user id.'));
        socket.data.userId = String(userId);
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
    payload: { targetType?: 'COURSE' | 'LESSON'; targetId?: string },
  ) {
    const targetType = payload?.targetType;
    const targetId = payload?.targetId;
    if (!targetType || !targetId || !mongoose.isValidObjectId(targetId)) {
      throw new BadRequestError('Invalid discussion room.');
    }
    const userId = String(socket.data.userId);
    const user = await User.findById(userId).select('role').lean();
    if (!user) throw new BadRequestError('Authenticated user was not found.');
    if (targetType === 'COURSE') {
      await this.learningAccess.assertCourseInteractionAccess(targetId, { id: userId, role: user.role });
    } else {
      await this.learningAccess.assertLessonInteractionAccess(targetId, { id: userId, role: user.role });
    }
    socket.join(discussionRoom(targetType, targetId));
    return { ok: true };
  }

  @SubscribeMessage('discussion:leave')
  leaveDiscussion(@ConnectedSocket() socket: Socket, payload: { targetType?: 'COURSE' | 'LESSON'; targetId?: string }) {
    if (payload?.targetType && payload.targetId && mongoose.isValidObjectId(payload.targetId)) {
      socket.leave(discussionRoom(payload.targetType, payload.targetId));
    }
    return { ok: true };
  }
}

export function getSocketServer() {
  return ioInstance;
}

export const discussionRoom = (targetType: 'COURSE' | 'LESSON', targetId: string) =>
  `discussion:${targetType}:${targetId}`;
