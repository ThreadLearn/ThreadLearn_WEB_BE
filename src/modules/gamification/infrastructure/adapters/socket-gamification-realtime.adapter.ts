import { Injectable } from '@nestjs/common';
import {
  IGamificationRealtimePort,
  XpAwardedRealtimePayload,
} from '../../domain/interfaces/gamification-realtime.port';
import { getSocketServer } from '../../../../socket';

@Injectable()
export class SocketGamificationRealtimeAdapter implements IGamificationRealtimePort {
  emitXpAwarded(userId: string, payload: XpAwardedRealtimePayload): void {
    getSocketServer()?.to(`user:${userId}`).emit('xp:awarded', payload);
  }

  emitLeaderboardUpdate(): void {
    getSocketServer()?.emit('leaderboard:update');
  }
}
