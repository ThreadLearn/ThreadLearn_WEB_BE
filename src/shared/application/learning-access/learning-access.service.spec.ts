import { ForbiddenError } from '../../../common/custom-error';
import { ILearningAccessData } from '../../domain/interfaces/learning-access-data.port';
import { LearningAccessService } from './learning-access.service';

describe('LearningAccessService instructor discussion access', () => {
  const assignedInstructorId = '507f1f77bcf86cd799439011';
  const anotherInstructorId = '507f1f77bcf86cd799439012';
  const courseId = '507f1f77bcf86cd799439013';
  const lessonId = '507f1f77bcf86cd799439014';
  let data: jest.Mocked<ILearningAccessData>;
  let service: LearningAccessService;

  beforeEach(() => {
    data = {
      findLesson: jest.fn().mockResolvedValue({
        id: lessonId, courseId, status: 'published', isPreview: false,
        isLocked: false, title: 'Lesson',
      }),
      findCourse: jest.fn().mockResolvedValue({
        id: courseId, status: 'draft', isPremium: true, title: 'Course',
        instructorId: assignedInstructorId,
      }),
      isEnrolled: jest.fn().mockResolvedValue(false),
      hasActivePremium: jest.fn().mockResolvedValue(false),
      touchCursor: jest.fn(),
    };
    service = new LearningAccessService(data);
  });

  it('allows the assigned instructor without student enrollment or premium', async () => {
    await expect(service.assertLessonInteractionAccess(lessonId, {
      id: assignedInstructorId, role: 'STUDENT',
    })).resolves.toMatchObject({ id: lessonId, courseId });
    await expect(service.assertCourseInteractionAccess(courseId, {
      id: assignedInstructorId, role: 'STUDENT',
    })).resolves.toMatchObject({ id: courseId });
    expect(data.isEnrolled).not.toHaveBeenCalled();
  });

  it('does not grant another instructor access to an unassigned course', async () => {
    await expect(service.assertCourseInteractionAccess(courseId, {
      id: anotherInstructorId, role: 'STUDENT',
    })).rejects.toBeInstanceOf(ForbiddenError);
  });
});
