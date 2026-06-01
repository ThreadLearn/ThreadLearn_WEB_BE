import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel('User')       private userModel:       Model<any>,
    @InjectModel('Course')     private courseModel:     Model<any>,
    @InjectModel('Lesson')     private lessonModel:     Model<any>,
    @InjectModel('Enrollment') private enrollmentModel: Model<any>,
  ) {}

  /** UC14 — Platform-wide stats for Admin Dashboard. */
  async getPlatformStats() {
    const [
      totalUsers, totalStudents, premiumUsers,
      totalCourses, publishedCourses,
      totalLessons, totalEnrollments,
    ] = await Promise.all([
      this.userModel.countDocuments({}),
      this.userModel.countDocuments({ role: 'STUDENT' }),
      this.userModel.countDocuments({ isPremium: true }),
      this.courseModel.countDocuments({ isDeleted: false }),
      this.courseModel.countDocuments({ isDeleted: false, isPublished: true }),
      this.lessonModel.countDocuments({ isDeleted: false }),
      this.enrollmentModel.countDocuments({}),
    ]);

    // 7-day enrollment trend bucketed by day for a sparkline.
    const since = new Date(Date.now() - 7 * 86_400_000);
    const trend = await this.enrollmentModel.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    return {
      totalUsers, totalStudents, premiumUsers,
      totalCourses, publishedCourses,
      totalLessons, totalEnrollments,
      enrollmentTrend: trend,
    };
  }
}
