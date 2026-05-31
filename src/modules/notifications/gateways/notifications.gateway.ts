import {
  WebSocketGateway, WebSocketServer,
  OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/notifications' })
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(socket: Socket) {
    const token =
      (socket.handshake.auth?.token as string) ??
      socket.handshake.headers.authorization?.replace('Bearer ', '');

    if (!token) { socket.disconnect(); return; }

    try {
      const payload = this.jwtService.verify<{ id: string }>(token);
      socket.data.userId = payload.id;
      socket.join(`user:${payload.id}`);
      this.logger.debug(`User ${payload.id} connected to /notifications`);
    } catch {
      socket.disconnect();
    }
  }

  handleDisconnect(socket: Socket) {
    this.logger.debug(`Socket ${socket.id} disconnected from /notifications`);
  }

  emitToUser(userId: string, payload: any) {
    this.server.to(`user:${userId}`).emit('notification', payload);
  }
}
