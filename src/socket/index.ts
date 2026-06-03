import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../configs/env';
import { logger } from '../configs/logger';

let ioInstance: Server | null = null;

/**
 * Realtime notifications gateway (UC68d).
 *
 * Namespace: `/notifications`
 *
 * Auth: clients MUST pass a valid JWT via `socket.handshake.auth.token`
 * (socket.io-client `auth: { token }`) or `?token=` query. We verify it
 * server-side and join `user:<verified-id>` so notifications emitted by
 * `NotificationsService.sendNotification` reach the correct user regardless
 * of what the client claims.
 */
@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    credentials: false,
    methods: ['GET', 'POST'],
  },
})
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  afterInit(server: Server) {
    ioInstance = server;
    logger.info('Socket.IO /notifications namespace initialized.');
  }

  handleConnection(socket: Socket) {
    const token =
      (socket.handshake.auth?.token as string | undefined) ??
      (socket.handshake.query?.token as string | undefined);

    if (!token) {
      logger.warn(`WS reject (no token): ${socket.id}`);
      socket.emit('auth_error', { message: 'Missing token' });
      socket.disconnect(true);
      return;
    }

    try {
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as {
        id?: string;
        sub?: string;
        email?: string;
      };
      const userId = payload.id ?? payload.sub;
      if (!userId) {
        socket.emit('auth_error', { message: 'Invalid token payload' });
        socket.disconnect(true);
        return;
      }
      socket.data.userId = userId;
      socket.join(`user:${userId}`);
      logger.info(`WS connect ${socket.id} -> user:${userId}`);
      socket.emit('ready', { userId });
    } catch (err) {
      logger.warn(`WS reject (bad token): ${socket.id} — ${(err as Error).message}`);
      socket.emit('auth_error', { message: 'Invalid or expired token' });
      socket.disconnect(true);
    }
  }

  handleDisconnect(socket: Socket) {
    if (socket.data.userId) {
      logger.info(`WS disconnect ${socket.id} (user:${socket.data.userId})`);
    }
  }
}

export function getSocketServer() {
  return ioInstance;
}
