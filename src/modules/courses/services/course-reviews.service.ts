import mongoose from 'mongoose';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../common/custom-error';
import { Enrollment } from '../../enrollments/models/enrollment.model';
import { Course } from '../models/course.model';
import { CourseReview } from '../models/course-review.model';

export class CourseReviewsService {
  static async list(courseId: string, page = 1, limit = 10) {
    if (!mongoose.isValidObjectId(courseId)) throw new BadRequestError('Invalid course id.');
    const skip = (page - 1) * limit;
    const [reviews, total] = await Promise.all([
      CourseReview.find({ courseId, status: 'active' })
        .populate('userId', 'firstName lastName avatarUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CourseReview.countDocuments({ courseId, status: 'active' }),
    ]);
    return { reviews, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  static async createOrUpdate(
    userId: string,
    courseId: string,
    data: { rating: number; content?: string }
  ) {
    if (!mongoose.isValidObjectId(courseId)) throw new BadRequestError('Invalid course id.');
    const rating = Number(data.rating);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      throw new BadRequestError('Rating must be an integer between 1 and 5.');
    }
    const course = await Course.findById(courseId);
    if (!course || course.status === 'deleted') throw new NotFoundError('Course not found.');

    const enrollment = await Enrollment.findOne({ userId, courseId });
    if (!enrollment) throw new ForbiddenError('You must enroll before reviewing this course.');
    if ((enrollment.progressPercent ?? enrollment.progress) < 50) {
      throw new ForbiddenError('You need at least 50% progress to review this course.');
    }

    const review = await CourseReview.findOneAndUpdate(
      { userId, courseId },
      {
        $set: {
          rating: Math.round(rating),
          content: data.content,
          status: 'active',
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    await this.refreshCourseRating(courseId);
    return review;
  }

  static async hide(reviewId: string) {
    if (!mongoose.isValidObjectId(reviewId)) throw new BadRequestError('Invalid review id.');
    const review = await CourseReview.findByIdAndUpdate(reviewId, { status: 'hidden' }, { new: true });
    if (!review) throw new NotFoundError('Review not found.');
    await this.refreshCourseRating(review.courseId.toString());
    return review;
  }

  private static async refreshCourseRating(courseId: string) {
    const stats = await CourseReview.aggregate([
      { $match: { courseId: new mongoose.Types.ObjectId(courseId), status: 'active' } },
      { $group: { _id: '$courseId', averageRating: { $avg: '$rating' }, totalReviews: { $sum: 1 } } },
    ]);
    const next = stats[0] ?? { averageRating: 0, totalReviews: 0 };
    await Course.findByIdAndUpdate(courseId, {
      averageRating: Math.round(next.averageRating * 10) / 10,
      totalReviews: next.totalReviews,
    });
  }
}

export default CourseReviewsService;
