export interface XpAwardedRealtimePayload {
  xp: number;
  totalXp: number;
  level: number;
}

export interface IGamificationRealtimePort {
  emitXpAwarded(userId: string, payload: XpAwardedRealtimePayload): void;
  emitLeaderboardUpdate(): void;
}

export const GAMIFICATION_REALTIME_PORT = Symbol('GAMIFICATION_REALTIME_PORT');
