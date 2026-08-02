import { Injectable } from '@nestjs/common';
import mongoose from 'mongoose';
import { CodeSubmission, SubmissionCounter } from '../../models/code-submission.model';

@Injectable()
export class MongoSubmissionRepository {
  async findIdempotent(userId: string, exerciseId: string, idempotencyKey?: string) {
    if (!idempotencyKey) return null;
    return CodeSubmission.findOne({ userId, exerciseId, idempotencyKey });
  }

  async reserveAttempt(userId: string, exerciseId: string, maxSubmissions: number | null | undefined): Promise<number | null> {
    await SubmissionCounter.updateOne({ userId, exerciseId }, { $setOnInsert: { userId, exerciseId, usedAttempts: 0 } }, { upsert: true });
    const filter: Record<string, unknown> = { userId, exerciseId };
    if (maxSubmissions != null) filter.usedAttempts = { $lt: maxSubmissions };
    const counter = await SubmissionCounter.findOneAndUpdate(filter, { $inc: { usedAttempts: 1 } }, { new: true });
    return counter ? counter.usedAttempts : null;
  }

  async releaseAttempt(userId: string, exerciseId: string) {
    await SubmissionCounter.updateOne({ userId, exerciseId, usedAttempts: { $gt: 0 } }, { $inc: { usedAttempts: -1 } });
  }

  async create(data: Record<string, unknown>) {
    return CodeSubmission.create(data);
  }

  async update(id: string, patch: Record<string, unknown>) {
    return CodeSubmission.findByIdAndUpdate(id, { $set: patch }, { new: true });
  }

  async findForStudent(userId: string, id: string) {
    if (!mongoose.isValidObjectId(id)) return null;
    return CodeSubmission.findOne({ _id: id, userId });
  }

  async listForStudent(userId: string, exerciseId: string, page: number, limit: number) {
    const filter = { userId, exerciseId };
    const [items, total] = await Promise.all([
      CodeSubmission.find(filter).sort({ submittedAt: -1 }).skip((page - 1) * limit).limit(limit),
      CodeSubmission.countDocuments(filter),
    ]);
    return { items, total };
  }

  async listForAdmin(exerciseId: string, page: number, limit: number) {
    const [items, total] = await Promise.all([
      CodeSubmission.find({ exerciseId }).sort({ submittedAt: -1 }).skip((page - 1) * limit).limit(limit).populate('userId', 'name email avatarUrl'),
      CodeSubmission.countDocuments({ exerciseId }),
    ]);
    return { items, total };
  }

  async candidatesForSimilarity(exerciseId: string, userId: string, limit = 100) {
    return CodeSubmission.find({ exerciseId, userId: { $ne: userId }, submissionStatus: 'GRADED' })
      .sort({ submittedAt: -1 }).limit(limit).select('_id sourceCode userId');
  }
}
