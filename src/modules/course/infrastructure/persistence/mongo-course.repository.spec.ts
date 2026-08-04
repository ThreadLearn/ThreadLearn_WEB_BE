import { MongoCourseRepository } from './mongo-course.repository';

describe('MongoCourseRepository Instructor ownership filter', () => {
  const instructorId = '507f1f77bcf86cd799439011';

  it('filters by instructorId in Mongo and always excludes soft-deleted Courses', () => {
    const repository = new MongoCourseRepository();
    const buildMongoFilter = (repository as unknown as {
      buildMongoFilter: (filter: Record<string, unknown>) => Record<string, unknown>;
    }).buildMongoFilter.bind(repository);

    const filter = buildMongoFilter({
      includeAll: true,
      instructorId,
      status: 'deleted',
    });

    expect(String(filter.instructorId)).toBe(instructorId);
    expect(filter.status).toEqual({ $ne: 'deleted' });
  });
});
