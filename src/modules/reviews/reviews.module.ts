import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReviewsController } from './controllers/reviews.controller';
import { ReviewsService } from './services/reviews.service';
import { CourseReviewSchema } from './models/course-review.model';
import { EnrollmentSchema } from '../enrollments/models/enrollment.model';
import { CourseSchema } from '../courses/models/course.model';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'CourseReview', schema: CourseReviewSchema },
      { name: 'Enrollment',   schema: EnrollmentSchema },
      { name: 'Course',       schema: CourseSchema },
    ]),
  ],
  controllers: [ReviewsController],
  providers:   [ReviewsService],
})
export class ReviewsModule {}
