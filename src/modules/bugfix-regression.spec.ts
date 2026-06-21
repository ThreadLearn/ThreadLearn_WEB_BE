import { CodeExecution } from './code-execution/models/code-execution.model';
import { CodeExecutionService } from './code-execution/services/code-execution.service';
import { CommentService } from './comment/services/comment.service';
import { User } from './auth/models/user.model';
import { Course } from './courses/models/course.model';
import { Enrollment } from './enrollments/models/enrollment.model';
import { EnrollmentsService } from './enrollments/services/enrollments.service';
import { UserStats } from './gamification/models/user-stats.model';
import { Note } from './notes/models/note.model';
import { NotesService } from './notes/services/notes.service';
import { Notification } from './notifications/models/notification.model';
import { QuizAttempt } from './quiz-attempts/models/quiz-attempt.model';
import { QuizAttemptsService } from './quiz-attempts/application/services/quiz-attempts.facade';
import { Quiz } from './quiz/models/quiz.model';
import { LearningAccessService } from '../shared/application/learning-access/learning-access.service';

describe('reported bug regressions', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('passes the real role and allows preview lessons for IDE runs', async () => {
    jest.spyOn(CodeExecution, 'countDocuments').mockResolvedValue(0);
    const accessError = new Error('stop after access check');
    const accessSpy = jest.fn().mockRejectedValue(accessError);

    await expect(
      CodeExecutionService.executeCode(
        '507f1f77bcf86cd799439011',
        {
          lessonId: '507f1f77bcf86cd799439012',
          sourceCode: 'console.log("ok")',
          language: 'javascript',
        },
        'ADMIN',
        { assertLessonViewAccess: accessSpy },
      )
    ).rejects.toBe(accessError);

    expect(accessSpy).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439012',
      { id: '507f1f77bcf86cd799439011', role: 'ADMIN' }
    );
  });

  it('returns null when the student has not enrolled in a course', async () => {
    jest.spyOn(Enrollment, 'findOne').mockResolvedValue(null);

    await expect(
      EnrollmentsService.getMyCourseEnrollment(
        '507f1f77bcf86cd799439011',
        '507f1f77bcf86cd799439012'
      )
    ).resolves.toBeNull();
  });

  it('keeps premium enrollment blocked for free students', async () => {
    jest.spyOn(Course, 'findById').mockResolvedValue({
      status: 'published',
      isPremium: true,
    } as never);
    const select = jest.fn().mockResolvedValue({
      planType: 'FREE',
      subscriptionExpiresAt: undefined,
    });
    jest.spyOn(User, 'findById').mockReturnValue({ select } as never);

    await expect(
      EnrollmentsService.enrollInCourse(
        '507f1f77bcf86cd799439011',
        '507f1f77bcf86cd799439012'
      )
    ).rejects.toMatchObject({
      message: 'COURSE_PREMIUM_REQUIRED',
      statusCode: 403,
    });
  });

  it('blocks course comments on premium courses for free students', async () => {
    const isEnrolled = jest.fn();
    const accessPort = new LearningAccessService({
      findLesson: jest.fn(),
      findCourse: jest.fn().mockResolvedValue({
        id: '507f1f77bcf86cd799439012',
        status: 'published',
        isPremium: true,
      }),
      isEnrolled,
      hasActivePremium: jest.fn().mockResolvedValue(false),
      touchCursor: jest.fn().mockResolvedValue(undefined),
    });

    await expect(
      CommentService.createComment('507f1f77bcf86cd799439011', 'STUDENT', {
        targetType: 'COURSE',
        targetId: '507f1f77bcf86cd799439012',
        content: 'premium course comment',
      }, accessPort),
    ).rejects.toMatchObject({
      message: 'You need an active premium plan to comment on this course.',
      statusCode: 403,
    });
    expect(isEnrolled).not.toHaveBeenCalled();
  });

  it('filters enrollments whose populated course no longer exists', async () => {
    const validEnrollment = { _id: 'valid', courseId: { _id: 'course' } };
    const orphanEnrollment = { _id: 'orphan', courseId: null };
    const sort = jest.fn().mockResolvedValue([validEnrollment, orphanEnrollment]);
    const populate = jest.fn().mockReturnValue({ sort });
    jest.spyOn(Enrollment, 'find').mockReturnValue({ populate } as never);

    await expect(
      EnrollmentsService.listMyEnrollments('507f1f77bcf86cd799439011')
    ).resolves.toEqual([validEnrollment]);
  });

  it('returns only the most recently updated note for a lesson', async () => {
    const latest = { _id: 'latest-note', noteText: 'Current note' };
    const accessPort = { assertLessonInteractionAccess: jest.fn().mockResolvedValue({} as never) };
    const sort = jest.fn().mockResolvedValue(latest);
    jest.spyOn(Note, 'findOne').mockReturnValue({ sort } as never);

    await expect(
      NotesService.listByLesson(
        '507f1f77bcf86cd799439011',
        '507f1f77bcf86cd799439012',
        accessPort,
      )
    ).resolves.toEqual([latest]);
    expect(sort).toHaveBeenCalledWith({ updatedAt: -1 });
  });

  it('grades quiz answers by question id', async () => {
    const quiz = {
      _id: 'quiz',
      passingScore: 50,
      xpReward: 100,
      questions: [
        { _id: 'question-a', correctAnswerIndex: 1 },
        { _id: 'question-b', correctAnswerIndex: 0 },
      ],
    };
    jest.spyOn(Quiz, 'findById').mockResolvedValue(quiz as never);
    jest.spyOn(QuizAttempt, 'create').mockImplementation(async (data) => data as never);
    jest.spyOn(UserStats, 'findOne').mockResolvedValue(null);
    jest.spyOn(Notification, 'create').mockResolvedValue({} as never);

    const result = await new QuizAttemptsService().submitAttempt('student', 'quiz', {
      'question-a': 1,
      'question-b': 2,
    });

    expect(result.score).toBe(50);
    expect(result.passed).toBe(true);
  });

  it('keeps compatibility with legacy index-keyed quiz answers', async () => {
    const quiz = {
      _id: 'quiz',
      passingScore: 80,
      xpReward: 100,
      questions: [
        { _id: 'question-a', correctAnswerIndex: 1 },
        { _id: 'question-b', correctAnswerIndex: 0 },
      ],
    };
    jest.spyOn(Quiz, 'findById').mockResolvedValue(quiz as never);
    jest.spyOn(QuizAttempt, 'create').mockImplementation(async (data) => data as never);

    const result = await new QuizAttemptsService().submitAttempt('student', 'quiz', {
      0: 1,
      1: 2,
    });

    expect(result.score).toBe(50);
    expect(result.passed).toBe(false);
  });

  it('grades quiz answers within time limit successfully', async () => {
    const quiz = {
      _id: 'quiz',
      passingScore: 50,
      xpReward: 100,
      questions: [
        { _id: 'question-a', correctAnswerIndex: 1 },
      ],
      timeLimit: 600, // 10 minutes
    };
    jest.spyOn(Quiz, 'findById').mockResolvedValue(quiz as never);
    jest.spyOn(QuizAttempt, 'create').mockImplementation(async (data) => data as never);
    jest.spyOn(UserStats, 'findOne').mockResolvedValue(null);
    jest.spyOn(Notification, 'create').mockResolvedValue({} as never);

    // 1 minute ago
    const startTime = new Date(Date.now() - 60 * 1000).toISOString();
    const result = await new QuizAttemptsService().submitAttempt('507f1f77bcf86cd799439011', 'quiz', {
      'question-a': 1,
    }, startTime);

    expect(result.score).toBe(100);
    expect(result.passed).toBe(true);
    expect(result.isTimeout).toBe(false);
  });

  it('fails quiz attempt when time limit is exceeded', async () => {
    const quiz = {
      _id: 'quiz',
      passingScore: 50,
      questions: [
        { _id: 'question-a', correctAnswerIndex: 1 },
      ],
      timeLimit: 600, // 10 minutes
    };
    jest.spyOn(Quiz, 'findById').mockResolvedValue(quiz as never);
    jest.spyOn(QuizAttempt, 'create').mockImplementation(async (data) => data as never);
    jest.spyOn(UserStats, 'findOne').mockResolvedValue(null);
    jest.spyOn(Notification, 'create').mockResolvedValue({} as never);

    // 11 minutes ago (exceeded 10 mins + 15s buffer)
    const startTime = new Date(Date.now() - 11 * 60 * 1000).toISOString();
    const result = await new QuizAttemptsService().submitAttempt('507f1f77bcf86cd799439011', 'quiz', {
      'question-a': 1,
    }, startTime);

    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
    expect(result.isTimeout).toBe(true);
  });

  it('retrieves user quiz attempts history successfully', async () => {
    const mockAttempts = [{ _id: 'attempt-1', score: 100 }];
    const populateMock = jest.fn().mockResolvedValue(mockAttempts);
    const sortMock = jest.fn().mockReturnValue({ populate: populateMock });
    jest.spyOn(QuizAttempt, 'find').mockReturnValue({ sort: sortMock } as never);

    const result = await new QuizAttemptsService().getMyAttempts('507f1f77bcf86cd799439011');
    expect(result).toEqual(mockAttempts);
    expect(QuizAttempt.find).toHaveBeenCalledWith({ userId: '507f1f77bcf86cd799439011' });
  });

  it('retrieves specific user quiz attempt by id successfully', async () => {
    const mockAttempt = { _id: 'attempt-1', userId: '507f1f77bcf86cd799439011', score: 100 };
    const populateMock = jest.fn().mockResolvedValue(mockAttempt);
    jest.spyOn(QuizAttempt, 'findOne').mockReturnValue({ populate: populateMock } as never);

    const result = await new QuizAttemptsService().getAttemptById('507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012');
    expect(result).toEqual(mockAttempt);
    expect(QuizAttempt.findOne).toHaveBeenCalledWith({ _id: '507f1f77bcf86cd799439012', userId: '507f1f77bcf86cd799439011' });
  });
});
