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

@WebSocketGateway({
  cors: {
    origin: env.FRONTEND_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
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
}

export function getSocketServer() {
  return ioInstance;
}
