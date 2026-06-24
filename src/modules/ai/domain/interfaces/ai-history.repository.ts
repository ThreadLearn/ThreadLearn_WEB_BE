import { AIHistoryEntity } from '../entities/ai-history.entity';

export interface AIUserProfile {
  id: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  planType?: string;
  subscriptionExpiresAt?: Date;
}

export interface AICourseProfile {
  id: string;
  title: string;
}

export interface IAIHistoryRepository {
  create(history: AIHistoryEntity): Promise<unknown>;
  listByUser(userId: string): Promise<unknown[]>;
  findByUserAndId(userId: string, id: string): Promise<unknown | null>;
  updateFeedback(userId: string, id: string, feedbackRating: number): Promise<unknown | null>;
  countToday(userId: string, since: Date): Promise<number>;
  findUserProfile(userId: string): Promise<AIUserProfile | null>;
  findCourseProfile(courseId: string): Promise<AICourseProfile | null>;
  purgeFreeHistory(cutoff: Date): Promise<number>;
}

export const AI_HISTORY_REPOSITORY = Symbol('AI_HISTORY_REPOSITORY');
