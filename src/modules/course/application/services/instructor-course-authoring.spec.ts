import { ForbiddenError } from '../../../../common/custom-error';
import { CourseEntity } from '../../domain/entities/course.entity';
import { ICourseRepository } from '../../domain/interfaces/course.repository';
import { ICourseContentPort } from '../../domain/interfaces/course-content.port';
import { CourseManagementPolicy } from '../policies/course-management.policy';
import { CreateInstructorCourseService } from './create-instructor-course.service';
import { UpdateInstructorCourseService } from './update-instructor-course.service';
import { GetInstructorCourseDetailService } from './get-instructor-course-detail.service';

describe('Phase 5A — Instructor Course & Section Authoring Security Tests', () => {
  let policy: CourseManagementPolicy;
  let mockCourseRepo: jest.Mocked<ICourseRepository>;
  let mockContentPort: jest.Mocked<ICourseContentPort>;

  let createInstructorCourseService: CreateInstructorCourseService;
  let updateInstructorCourseService: UpdateInstructorCourseService;
  let getInstructorCourseDetailService: GetInstructorCourseDetailService;

  const inst1Actor = { id: 'inst-1', role: 'INSTRUCTOR' };
  const inst2Actor = { id: 'inst-2', role: 'INSTRUCTOR' };
  const studentActor = { id: 'student-1', role: 'STUDENT' };

  beforeEach(() => {
    policy = new CourseManagementPolicy();

    mockCourseRepo = {
      findById: jest.fn(),
      findByIdOrSlug: jest.fn(),
      create: jest.fn((c) => Promise.resolve(c)),
      update: jest.fn((c) => Promise.resolve(c)),
      list: jest.fn(),
      isSlugTaken: jest.fn().mockResolvedValue(false),
      incrementEnrollmentCount: jest.fn(),
    };

    mockContentPort = {
      getContent: jest.fn().mockResolvedValue({ sections: [], lessons: [] }),
      countActiveLessons: jest.fn().mockResolvedValue(0),
      refreshLessonCount: jest.fn().mockResolvedValue(0),
    };

    createInstructorCourseService = new CreateInstructorCourseService(mockCourseRepo);
    updateInstructorCourseService = new UpdateInstructorCourseService(mockCourseRepo, policy);
    getInstructorCourseDetailService = new GetInstructorCourseDetailService(mockCourseRepo, mockContentPort, policy);
  });

  describe('Course Creation Security', () => {
    it('1. Instructor creates Course successfully, forces actor ID as instructorId & createdBy, and sets status to draft', async () => {
      const input = {
        title: 'Python for Beginners',
        description: 'Learn Python basics.',
        shortDescription: 'Short intro',
        level: 'BEGINNER' as const,
        language: 'python' as const,
      };

      const created = await createInstructorCourseService.execute(inst1Actor, input);

      expect(created.title).toBe('Python for Beginners');
      expect(created.status).toBe('draft');
      expect(created.toProps().instructorId).toBe('inst-1');
      expect(created.toProps().createdBy).toBe('inst-1');
      expect(created.toProps().isPremium).toBe(false);
      expect(created.toProps().price).toBe(0);
      expect(mockCourseRepo.create).toHaveBeenCalled();
    });

    it('2. Student cannot create Course', async () => {
      await expect(
        createInstructorCourseService.execute(studentActor, {
          title: 'Illegal Course',
          description: 'Desc',
        }),
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('Course Update & Field Allowlist Security', () => {
    it('3. Assigned Instructor updates course content successfully', async () => {
      const existingCourse = CourseEntity.fromPersistence({
        id: 'course-1',
        title: 'Original Title',
        slug: 'original-title',
        description: 'Original Desc',
        language: 'javascript',
        level: 'BEGINNER',
        tags: [],
        isPremium: false,
        price: 0,
        status: 'draft',
        prerequisites: [],
        prerequisiteThreshold: 80,
        estimatedDuration: 60,
        totalLessons: 0,
        totalEnrollments: 0,
        averageRating: 0,
        totalReviews: 0,
        instructorId: 'inst-1',
        createdBy: 'inst-1',
      });
      mockCourseRepo.findById.mockResolvedValue(existingCourse);

      const updated = await updateInstructorCourseService.execute(inst1Actor, 'course-1', {
        description: 'Updated Description',
        tags: ['js', 'frontend'],
      });

      expect(updated.toProps().description).toBe('Updated Description');
      expect(updated.toProps().tags).toEqual(['js', 'frontend']);
    });

    it('4. Instructor sending isPremium and price in update payload has those fields ignored (Admin-only)', async () => {
      const existingCourse = CourseEntity.fromPersistence({
        id: 'course-1',
        title: 'Original Title',
        slug: 'original-title',
        description: 'Original Desc',
        language: 'javascript',
        level: 'BEGINNER',
        tags: [],
        isPremium: false,
        price: 0,
        status: 'draft',
        prerequisites: [],
        prerequisiteThreshold: 80,
        estimatedDuration: 60,
        totalLessons: 0,
        totalEnrollments: 0,
        averageRating: 0,
        totalReviews: 0,
        instructorId: 'inst-1',
        createdBy: 'inst-1',
      });
      mockCourseRepo.findById.mockResolvedValue(existingCourse);

      const updated = await updateInstructorCourseService.execute(inst1Actor, 'course-1', {
        description: 'Updated',
        isPremium: true,
        price: 99.99,
        status: 'published',
        instructorId: 'inst-2',
        createdBy: 'hacker-1',
      } as any);

      // Verify Admin-only & ownership fields remained unchanged!
      expect(updated.toProps().isPremium).toBe(false);
      expect(updated.toProps().price).toBe(0);
      expect(updated.status).toBe('draft');
      expect(updated.toProps().instructorId).toBe('inst-1');
      expect(updated.toProps().createdBy).toBe('inst-1');
    });

    it('5. Other Instructor attempting to update Course is rejected (403)', async () => {
      const existingCourse = CourseEntity.fromPersistence({
        id: 'course-1',
        title: 'Course 1',
        slug: 'course-1',
        description: 'Desc',
        language: 'javascript',
        level: 'BEGINNER',
        tags: [],
        isPremium: false,
        price: 0,
        status: 'draft',
        prerequisites: [],
        prerequisiteThreshold: 80,
        estimatedDuration: 60,
        totalLessons: 0,
        totalEnrollments: 0,
        averageRating: 0,
        totalReviews: 0,
        instructorId: 'inst-1',
      });
      mockCourseRepo.findById.mockResolvedValue(existingCourse);

      await expect(
        updateInstructorCourseService.execute(inst2Actor, 'course-1', { description: 'Hacked' }),
      ).rejects.toThrow(ForbiddenError);
    });

    it('6. Course reassigned by Admin while Instructor is editing returns 403 on next update', async () => {
      // Course initially inst-1, then Admin reassigns to inst-2
      const reassignedCourse = CourseEntity.fromPersistence({
        id: 'course-1',
        title: 'Reassigned Course',
        slug: 'reassigned-course',
        description: 'Desc',
        language: 'javascript',
        level: 'BEGINNER',
        tags: [],
        isPremium: false,
        price: 0,
        status: 'draft',
        prerequisites: [],
        prerequisiteThreshold: 80,
        estimatedDuration: 60,
        totalLessons: 0,
        totalEnrollments: 0,
        averageRating: 0,
        totalReviews: 0,
        instructorId: 'inst-2', // Reassigned to inst-2!
        createdBy: 'inst-1',
      });
      mockCourseRepo.findById.mockResolvedValue(reassignedCourse);

      // inst-1 tries to update
      await expect(
        updateInstructorCourseService.execute(inst1Actor, 'course-1', { description: 'Stale Edit' }),
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('Course Detail & Thumbnail Authorization', () => {
    it('7. Other Instructor cannot GET course detail (403)', async () => {
      const course = CourseEntity.fromPersistence({
        id: 'course-1',
        title: 'Title',
        slug: 'title',
        description: 'Desc',
        language: 'javascript',
        level: 'BEGINNER',
        tags: [],
        isPremium: false,
        price: 0,
        status: 'draft',
        prerequisites: [],
        prerequisiteThreshold: 80,
        estimatedDuration: 60,
        totalLessons: 0,
        totalEnrollments: 0,
        averageRating: 0,
        totalReviews: 0,
        instructorId: 'inst-1',
      });
      mockCourseRepo.findById.mockResolvedValue(course);

      await expect(getInstructorCourseDetailService.execute(inst2Actor, 'course-1')).rejects.toThrow(ForbiddenError);
    });

    it('8. Assigned Instructor can GET course detail successfully', async () => {
      const course = CourseEntity.fromPersistence({
        id: 'course-1',
        title: 'Title',
        slug: 'title',
        description: 'Desc',
        language: 'javascript',
        level: 'BEGINNER',
        tags: [],
        isPremium: false,
        price: 0,
        status: 'draft',
        prerequisites: [],
        prerequisiteThreshold: 80,
        estimatedDuration: 60,
        totalLessons: 0,
        totalEnrollments: 0,
        averageRating: 0,
        totalReviews: 0,
        instructorId: 'inst-1',
      });
      mockCourseRepo.findById.mockResolvedValue(course);

      const result = await getInstructorCourseDetailService.execute(inst1Actor, 'course-1');
      expect(result.course.id).toBe('course-1');
    });
  });

  describe('Published Course Authoring Restrictions', () => {
    it('1. Assigned Instructor cannot update Published Course', async () => {
      const publishedCourse = CourseEntity.fromPersistence({
        id: 'course-1',
        title: 'Published Title',
        slug: 'published-title',
        description: 'Desc',
        language: 'javascript',
        level: 'BEGINNER',
        tags: [],
        isPremium: false,
        price: 0,
        status: 'published', // Published!
        prerequisites: [],
        prerequisiteThreshold: 80,
        estimatedDuration: 60,
        totalLessons: 1,
        totalEnrollments: 0,
        averageRating: 0,
        totalReviews: 0,
        instructorId: 'inst-1',
      });
      mockCourseRepo.findById.mockResolvedValue(publishedCourse);

      await expect(
        updateInstructorCourseService.execute(inst1Actor, 'course-1', { description: 'New Desc' }),
      ).rejects.toThrow(ForbiddenError);
    });

    it('2. Assigned Instructor cannot upload thumbnail for Published Course', async () => {
      const publishedCourse = CourseEntity.fromPersistence({
        id: 'course-1',
        title: 'Published Title',
        slug: 'published-title',
        description: 'Desc',
        language: 'javascript',
        level: 'BEGINNER',
        tags: [],
        isPremium: false,
        price: 0,
        status: 'published',
        prerequisites: [],
        prerequisiteThreshold: 80,
        estimatedDuration: 60,
        totalLessons: 1,
        totalEnrollments: 0,
        averageRating: 0,
        totalReviews: 0,
        instructorId: 'inst-1',
      });
      mockCourseRepo.findById.mockResolvedValue(publishedCourse);

      await expect(
        updateInstructorCourseService.execute(inst1Actor, 'course-1', { thumbnailUrl: 'https://img.com/a.png' }),
      ).rejects.toThrow(ForbiddenError);
    });

    it('3. Admin can still update Published Course if needed', async () => {
      const publishedCourse = CourseEntity.fromPersistence({
        id: 'course-1',
        title: 'Published Title',
        slug: 'published-title',
        description: 'Desc',
        language: 'javascript',
        level: 'BEGINNER',
        tags: [],
        isPremium: false,
        price: 0,
        status: 'published',
        prerequisites: [],
        prerequisiteThreshold: 80,
        estimatedDuration: 60,
        totalLessons: 1,
        totalEnrollments: 0,
        averageRating: 0,
        totalReviews: 0,
        instructorId: 'inst-1',
      });
      mockCourseRepo.findById.mockResolvedValue(publishedCourse);

      const adminActor = { id: 'admin-1', role: 'ADMIN' };
      const updated = await updateInstructorCourseService.execute(adminActor, 'course-1', { description: 'Admin Edit' });
      expect(updated.toProps().description).toBe('Admin Edit');
    });

    it('4. Draft Course remains authorable by assigned Instructor', async () => {
      const draftCourse = CourseEntity.fromPersistence({
        id: 'course-1',
        title: 'Draft Title',
        slug: 'draft-title',
        description: 'Desc',
        language: 'javascript',
        level: 'BEGINNER',
        tags: [],
        isPremium: false,
        price: 0,
        status: 'draft',
        prerequisites: [],
        prerequisiteThreshold: 80,
        estimatedDuration: 60,
        totalLessons: 0,
        totalEnrollments: 0,
        averageRating: 0,
        totalReviews: 0,
        instructorId: 'inst-1',
      });
      mockCourseRepo.findById.mockResolvedValue(draftCourse);

      const updated = await updateInstructorCourseService.execute(inst1Actor, 'course-1', { description: 'Valid Draft Edit' });
      expect(updated.toProps().description).toBe('Valid Draft Edit');
    });
  });

  describe('Thumbnail Upload Authorization Order', () => {
    it('Course of another Instructor rejects before file save', async () => {
      const otherCourse = CourseEntity.fromPersistence({
        id: 'course-1',
        title: 'Draft Title',
        slug: 'draft-title',
        description: 'Desc',
        language: 'javascript',
        level: 'BEGINNER',
        tags: [],
        isPremium: false,
        price: 0,
        status: 'draft',
        prerequisites: [],
        prerequisiteThreshold: 80,
        estimatedDuration: 60,
        totalLessons: 0,
        totalEnrollments: 0,
        averageRating: 0,
        totalReviews: 0,
        instructorId: 'inst-1', // owned by inst-1
      });
      mockCourseRepo.findById.mockResolvedValue(otherCourse);

      // inst-2 tries to update thumbnail
      await expect(
        updateInstructorCourseService.execute(inst2Actor, 'course-1', { thumbnailUrl: 'https://img.com/a.png' }),
      ).rejects.toThrow(ForbiddenError);
    });

    it('Published Course rejects thumbnail update before file save', async () => {
      const publishedCourse = CourseEntity.fromPersistence({
        id: 'course-1',
        title: 'Published Title',
        slug: 'published-title',
        description: 'Desc',
        language: 'javascript',
        level: 'BEGINNER',
        tags: [],
        isPremium: false,
        price: 0,
        status: 'published',
        prerequisites: [],
        prerequisiteThreshold: 80,
        estimatedDuration: 60,
        totalLessons: 1,
        totalEnrollments: 0,
        averageRating: 0,
        totalReviews: 0,
        instructorId: 'inst-1',
      });
      mockCourseRepo.findById.mockResolvedValue(publishedCourse);

      await expect(
        updateInstructorCourseService.execute(inst1Actor, 'course-1', { thumbnailUrl: 'https://img.com/a.png' }),
      ).rejects.toThrow(ForbiddenError);
    });
  });
});
