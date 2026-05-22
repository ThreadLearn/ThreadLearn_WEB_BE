import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { logger } from '../configs/logger';

let ioInstance: SocketIOServer | null = null;

export function initializeSocketServer(server: HTTPServer) {
  ioInstance = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  logger.info('🔌 Initializing Socket.IO connection manager...');

  ioInstance.on('connection', (socket) => {
    logger.info(`🔌 Realtime client connected: ${socket.id}`);

    const userId = socket.handshake.auth.userId || socket.handshake.query.userId;
    if (userId) {
      socket.join(`user:${userId}`);
      logger.info(`👥 Socket ${socket.id} joined room "user:${userId}"`);
    }

    socket.on('disconnect', () => {
      logger.info(`🔌 Realtime client disconnected: ${socket.id}`);
    });
  });

  return ioInstance;
}

export function getSocketServer() {
  return ioInstance;
}
