import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { logger } from '../configs/logger';

let ioInstance: Server | null = null;

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  afterInit(server: Server) {
    ioInstance = server;
    logger.info('Socket.IO gateway initialized.');
  }

  handleConnection(socket: Socket) {
    logger.info(`Realtime client connected: ${socket.id}`);

    const userId = socket.handshake.auth.userId || socket.handshake.query.userId;
    if (userId) {
      socket.join(`user:${userId}`);
      logger.info(`Socket ${socket.id} joined room "user:${userId}"`);
    }
  }

  handleDisconnect(socket: Socket) {
    logger.info(`Realtime client disconnected: ${socket.id}`);
  }
}

export function getSocketServer() {
  return ioInstance;
}
