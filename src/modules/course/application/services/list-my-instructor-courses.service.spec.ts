import { ICourseRepository } from '../../domain/interfaces/course.repository';
import { ListMyInstructorCoursesService } from './list-my-instructor-courses.service';

const instructorA = '507f1f77bcf86cd799439011';
const instructorB = '507f1f77bcf86cd799439012';

describe('ListMyInstructorCoursesService', () => {
  it('filters directly by the authenticated Instructor and never asks the client for an owner id', async () => {
    const courseRepo = { list: jest.fn().mockResolvedValue({ items: [], total: 0 }) };
    const service = new ListMyInstructorCoursesService(courseRepo as unknown as ICourseRepository);

    await service.execute(instructorA, { page: 1, limit: 20, status: 'deleted' } as any);
    await service.execute(instructorB, { page: 1, limit: 20 } as any);

    expect(courseRepo.list).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ instructorId: instructorA, includeAll: true, status: undefined }),
      expect.any(Object),
    );
    expect(courseRepo.list).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ instructorId: instructorB, includeAll: true }),
      expect.any(Object),
    );
  });
});
