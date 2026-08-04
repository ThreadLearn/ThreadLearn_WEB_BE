import { CourseEntity } from '../../domain/entities/course.entity';
import { CourseMapper } from './course.mapper';

describe('CourseMapper ownership persistence', () => {
  const instructorId = '507f1f77bcf86cd799439011';

  it('preserves assigned instructorId and normalizes an unassigned Course to null persistence', () => {
    const assigned = CourseEntity.fromPersistence({
      id: '507f1f77bcf86cd799439021', title: 'Course', slug: 'course', description: 'Description', language: 'java', level: 'BEGINNER', tags: [], isPremium: false, price: 0, status: 'draft', prerequisites: [], prerequisiteThreshold: 80, estimatedDuration: 0, totalLessons: 0, totalEnrollments: 0, averageRating: 0, totalReviews: 0, instructorId,
    });
    expect(String(CourseMapper.toPersistence(assigned).instructorId)).toBe(instructorId);

    assigned.assignInstructor(undefined);
    expect(CourseMapper.toPersistence(assigned).instructorId).toBeNull();
  });
});
