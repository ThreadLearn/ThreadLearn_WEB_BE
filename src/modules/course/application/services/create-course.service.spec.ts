import { ICourseRepository } from '../../domain/interfaces/course.repository';
import { CourseInstructorAssignmentPolicy } from './course-instructor-assignment.policy';
import { CreateCourseService } from './create-course.service';

const instructorId = '507f1f77bcf86cd799439011';

describe('CreateCourseService instructor assignment', () => {
  const repo = { isSlugTaken: jest.fn(), create: jest.fn() };
  const policy = { resolveInstructorId: jest.fn() };
  const service = new CreateCourseService(
    repo as unknown as ICourseRepository,
    policy as unknown as CourseInstructorAssignmentPolicy,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    repo.isSlugTaken.mockResolvedValue(false);
    repo.create.mockImplementation(async (course) => course);
  });

  it('uses the shared assignment policy before creating a Course', async () => {
    policy.resolveInstructorId.mockResolvedValue(instructorId);

    const course = await service.execute({
      title: 'Concurrency Fundamentals',
      description: 'Learn threads safely.',
      instructorId,
      createdBy: 'admin-id',
    });

    expect(policy.resolveInstructorId).toHaveBeenCalledWith(instructorId);
    expect(course.toProps()).toMatchObject({ instructorId, createdBy: 'admin-id' });
  });
});
