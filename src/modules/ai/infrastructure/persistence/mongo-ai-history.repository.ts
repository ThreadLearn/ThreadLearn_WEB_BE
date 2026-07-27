import { Injectable } from '@nestjs/common';
import { User } from '../../../auth/models/user.model';
import { Course } from '../../../courses/models/course.model';
import { AIHistoryEntity } from '../../domain/entities/ai-history.entity';
import { AICourseProfile, AIUserProfile, IAIHistoryRepository } from '../../domain/interfaces/ai-history.repository';
import { AIHistory } from '../../models/ai-history.model';
import { AIHistoryMapper } from '../mapper/ai-history.mapper';

@Injectable()
export class MongoAIHistoryRepository implements IAIHistoryRepository {
  async create(history: AIHistoryEntity): Promise<unknown> {
    return AIHistory.create(AIHistoryMapper.toPersistence(history));
  }

  async listByUser(userId: string): Promise<unknown[]> {
    return AIHistory.find({ userId }).sort({ createdAt: -1 });
  }

  async listByUserPage(userId: string, page: number, limit: number) {
    const [items, total] = await Promise.all([
      AIHistory.find({ userId }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      AIHistory.countDocuments({ userId }),
    ]);
    return { items, total };
  }

  async findByUserAndId(userId: string, id: string): Promise<unknown | null> {
    return AIHistory.findOne({ _id: id, userId });
  }

  async updateFeedback(userId: string, id: string, feedbackRating: number): Promise<unknown | null> {
    return AIHistory.findOneAndUpdate({ _id: id, userId }, { feedbackRating }, { new: true });
  }

  async countToday(userId: string, since: Date): Promise<number> {
    return AIHistory.countDocuments({ userId, createdAt: { $gte: since } });
  }

  async findUserProfile(userId: string): Promise<AIUserProfile | null> {
    const user = await User.findById(userId);
    return user
      ? {
          id: String(user._id),
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          planType: user.planType,
          subscriptionExpiresAt: user.subscriptionExpiresAt,
          subscriptionFeatures: user.subscriptionFeatures,
        }
      : null;
  }

  async findCourseProfile(courseId: string): Promise<AICourseProfile | null> {
    const course = await Course.findById(courseId);
    return course ? { id: String(course._id), title: course.title } : null;
  }

  async purgeFreeHistory(cutoff: Date): Promise<number> {
    const freeUsers = await User.find({
      $or: [{ planType: { $ne: 'PREMIUM' } }, { planType: { $exists: false } }],
    }).select('_id');
    const freeIds = freeUsers.map((u) => u._id);
    if (!freeIds.length) return 0;
    const result = await AIHistory.deleteMany({ userId: { $in: freeIds }, createdAt: { $lt: cutoff } });
    return result.deletedCount ?? 0;
  }
}
