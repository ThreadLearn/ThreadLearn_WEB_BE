import { CourseEntity } from '../../domain/entities/course.entity';
import { ICourseRepository } from '../../domain/interfaces/course.repository';
import { CourseInstructorAssignmentPolicy } from './course-instructor-assignment.policy';
import { AssignCourseInstructorService } from './assign-course-instructor.service';

const courseId = '507f1f77bcf86cd799439021';
const instructorA = '507f1f77bcf86cd799439011';
const instructorB = '507f1f77bcf86cd799439012';

function course(owner?: string) {
  return CourseEntity.fromPersistence({
    id: courseId, title: 'Course', slug: 'course', description: 'Description', language: 'java', level: 'BEGINNER',
    tags: [], isPremium: false, price: 0, status: 'draft', prerequisites: [], prerequisiteThreshold: 80,
    estimatedDuration: 0, totalLessons: 0, totalEnrollments: 0, averageRating: 0, totalReviews: 0, instructorId: owner,
  });
}

describe('AssignCourseInstructorService', () => {
  const courseRepo = { findById: jest.fn(), update: jest.fn() };
  const policy = { resolveInstructorId: jest.fn() };
  const service = new AssignCourseInstructorService(
    courseRepo as unknown as ICourseRepository,
    policy as unknown as CourseInstructorAssignmentPolicy,
  );

  beforeEach(() => jest.resetAllMocks());

  it('assigns, reassigns, and unassigns through the shared policy', async () => {
    courseRepo.findById.mockResolvedValue(course());
    courseRepo.update.mockImplementation(async (entity) => entity);
    policy.resolveInstructorId.mockResolvedValueOnce(instructorA).mockResolvedValueOnce(instructorB).mockResolvedValueOnce(undefined);

    expect((await service.execute(courseId, instructorA)).toProps().instructorId).toBe(instructorA);
    courseRepo.findById.mockResolvedValue(course(instructorA));
    expect((await service.execute(courseId, instructorB)).toProps().instructorId).toBe(instructorB);
    courseRepo.findById.mockResolvedValue(course(instructorB));
    expect((await service.execute(courseId, null)).toProps().instructorId).toBeUndefined();
    expect(policy.resolveInstructorId).toHaveBeenNthCalledWith(3, null);
  });
});
