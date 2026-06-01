import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import mongoose from 'mongoose';
import { ICourseReview } from '../models/course-review.model';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../common/custom-error';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel('CourseReview') private reviewModel:     Model<ICourseReview>,
    @InjectModel('Enrollment')   private enrollmentModel: Model<any>,
    @InjectModel('Course')       private courseModel:     Model<any>,
  ) {}

  /** UC56 — must enroll + completedLessons ≥ 50% to leave a review. */
  async createReview(userId: string, courseId: string, rating: number, content: string) {
    if (!mongoose.isValidObjectId(courseId)) throw new NotFoundError('Course not found.');
    if (rating < 1 || rating > 5) throw new BadRequestError('Rating must be 1..5.');

    const enrollment = await this.enrollmentModel.findOne({ userId, courseId });
    if (!enrollment) throw new ForbiddenError('You must enroll the course first.');
    if (enrollment.progress < 50) {
      throw new ForbiddenError('You must complete at least 50% of lessons before reviewing.');
    }

    try {
      const review = await this.reviewModel.create({ userId, courseId, rating, content });
      await this.recomputeCourseRating(courseId);
      return review;
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new BadRequestError('You have already reviewed this course.');
      }
      throw err;
    }
  }

  /** UC57 — list reviews for a course (public). */
  async listForCourse(courseId: string, page = 1, limit = 10) {
    if (!mongoose.isValidObjectId(courseId)) throw new NotFoundError('Course not found.');
    const skip = (page - 1) * limit;
    const [items, total, avg] = await Promise.all([
      this.reviewModel
        .find({ courseId, status: 'active' })
        .populate('userId', 'firstName lastName avatarUrl')
        .sort({ helpfulCount: -1, createdAt: -1 })
        .skip(skip).limit(limit).lean(),
      this.reviewModel.countDocuments({ courseId, status: 'active' }),
      this.reviewModel.aggregate([
        { $match: { courseId: new mongoose.Types.ObjectId(courseId), status: 'active' } },
        { $group: {
            _id: null,
            avg: { $avg: '$rating' },
            distribution: { $push: '$rating' },
          } },
      ]),
    ]);

    // Star distribution {1: n, 2: n, ...}
    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    (avg[0]?.distribution ?? []).forEach((r: number) => { dist[r] = (dist[r] ?? 0) + 1; });

    return {
      data: items,
      total,
      averageRating: Math.round((avg[0]?.avg ?? 0) * 10) / 10,
      distribution:  dist,
      page, limit,
      hasMore: skip + items.length < total,
    };
  }

  private async recomputeCourseRating(courseId: string) {
    const result = await this.reviewModel.aggregate([
      { $match: { courseId: new mongoose.Types.ObjectId(courseId), status: 'active' } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    const averageRating = Math.round((result[0]?.avg ?? 0) * 10) / 10;
    const totalReviews  = result[0]?.count ?? 0;
    await this.courseModel.updateOne({ _id: courseId }, { averageRating, totalReviews });
  }
}
