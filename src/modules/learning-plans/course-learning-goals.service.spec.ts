import { CourseLearningGoalsService } from './course-learning-goals.service';
import { Enrollment } from '../enrollments/models/enrollment.model';
import { Lesson } from '../lessons/models/lesson.model';
import { LearningPlan } from './models/learning-plan.model';
import { CourseLearningGoal } from './models/course-learning-goal.model';

jest.mock('../enrollments/models/enrollment.model', () => ({
  Enrollment: { findOne: jest.fn(), findById: jest.fn() },
}));
jest.mock('../lessons/models/lesson.model', () => ({ Lesson: { find: jest.fn() } }));
jest.mock('./models/learning-plan.model', () => ({ LearningPlan: { findOne: jest.fn() } }));
jest.mock('./models/course-learning-goal.model', () => ({
  CourseLearningGoal: {
    findOne: jest.fn(),
    find: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findOneAndDelete: jest.fn(),
  },
}));

describe('CourseLearningGoalsService', () => {
  const service = new CourseLearningGoalsService();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-01T08:00:00.000Z'));
  });

  afterEach(() => jest.useRealTimers());

  it('evaluates one enrolled course using its own deadline and allocated weekly time', async () => {
    const goal = {
      userId: 'user-1',
      courseId: 'course-1',
      enrollmentId: 'enrollment-1',
      targetDate: new Date('2026-07-08T23:59:59.999Z'),
      priority: 'HIGH',
    };
    (CourseLearningGoal.findOne as jest.Mock).mockResolvedValue(goal);
    (CourseLearningGoal.find as jest.Mock).mockResolvedValue([goal]);
    (Enrollment.findById as jest.Mock).mockResolvedValue({
      progress: 25,
      completed: false,
      completedLessons: [],
    });
    (LearningPlan.findOne as jest.Mock).mockResolvedValue({
      weeklyHours: 3,
      preferredDays: [1, 3, 5],
    });
    (Lesson.find as jest.Mock).mockReturnValue({
      select: jest
        .fn()
        .mockReturnValue({
          lean: jest.fn().mockResolvedValue([{ _id: 'lesson-1', estimatedTime: 60 }]),
        }),
    });

    await expect(service.getMine('user-1', 'course-1')).resolves.toMatchObject({
      courseId: 'course-1',
      status: 'ON_TRACK',
      progressPercent: 25,
      remainingMinutes: 60,
      allocatedMinutesPerWeek: 180,
      suggestedSessionMinutes: 60,
    });
  });
});
