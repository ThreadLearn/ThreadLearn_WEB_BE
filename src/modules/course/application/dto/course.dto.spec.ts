import {
  assignCourseInstructorSchema,
  createCourseSchema,
  listCoursesQuerySchema,
  updateCourseSchema,
} from './course.dto';

describe('course DTO schemas', () => {
  const requiredCourse = {
    title: 'Introduction to asynchronous JavaScript',
    description: 'Learn how to design safe asynchronous JavaScript programs.',
  };

  it('uses the catalog default of 20 courses per page', () => {
    expect(listCoursesQuerySchema.parse({})).toMatchObject({ page: 1, limit: 20 });
  });

  it('requires the publish workflow instead of allowing a course to be created published', () => {
    expect(createCourseSchema.safeParse({ ...requiredCourse, status: 'published' }).success).toBe(false);
    expect(createCourseSchema.safeParse({ ...requiredCourse, status: 'draft' }).success).toBe(true);
  });

  it('allows optional ownership only at creation and keeps it out of general updates', () => {
    const instructorId = '507f1f77bcf86cd799439011';
    expect(createCourseSchema.parse({ ...requiredCourse, instructorId }).instructorId).toBe(instructorId);
    expect(updateCourseSchema.parse({ title: 'Updated', instructorId } as any)).not.toHaveProperty('instructorId');
    expect(assignCourseInstructorSchema.parse({ instructorId: null })).toEqual({ instructorId: null });
  });
});
