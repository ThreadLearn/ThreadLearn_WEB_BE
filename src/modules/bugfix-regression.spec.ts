import { CodeExecution } from './code-execution/models/code-execution.model';
import { CodeExecutionService } from './code-execution/application/services/code-execution.service';
import { CreateCommentService } from './comment/application/services/create-comment.service';
import { Enrollment } from './enrollments/models/enrollment.model';
import { EnrollInCourseService } from './enrollments/application/services/enroll-in-course.service';
import { GetMyCourseEnrollmentService } from './enrollments/application/services/get-my-course-enrollment.service';
import { MongoEnrollmentRepository } from './enrollments/infrastructure/persistence/mongo-enrollment.repository';
import { UserStats } from './gamification/models/user-stats.model';
import { Note } from './notes/models/note.model';
import { MongoNoteRepository } from './notes/infrastructure/persistence/mongo-note.repository';
import { Notification } from './notifications/models/notification.model';
import { QuizAttempt } from './quiz-attempts/models/quiz-attempt.model';
import { QuizAttemptsService } from './quiz-attempts/application/services/quiz-attempts.facade';
import { SubmitAttemptService } from './quiz-attempts/application/services/submit-attempt.service';
import { GetAttemptService } from './quiz-attempts/application/services/get-attempt.service';
import { GetMyAttemptsService } from './quiz-attempts/application/services/get-my-attempts.service';
import { QuizGradingService } from './quiz-attempts/domain/services/quiz-grading.service';
import { QuizAttemptRepository } from './quiz-attempts/infrastructure/persistence/repositories/mongo-quiz-attempt.repository';
import { Quiz } from './quiz/models/quiz.model';
import { LearningAccessService } from '../shared/application/learning-access/learning-access.service';
import { EnrollmentCompletionPublisher } from './enrollments/application/events/enrollment-completion.publisher';
import { CertificatesService } from './certificates/services/certificates.service';
import { NotificationsService } from './notifications/services/notifications.service';
import { CourseEntity } from './course/domain/entities/course.entity';
import { QuizMapper } from './quiz/infrastructure/mapper/quiz.mapper';
import { IQuizRepository } from './quiz/domain/interfaces/quiz.repository';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('reported bug regressions', () => {
  const createQuizAttemptsService = () => {
    const attemptsRepo = new QuizAttemptRepository();
    const quizRepo: IQuizRepository = {
      findById: jest.fn().mockImplementation(async (id: string) => {
        const doc = await Quiz.findById(id).exec();
        return doc ? QuizMapper.toEntity(doc) : null;
      }),
      findByLessonId: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    return new QuizAttemptsService(
      new SubmitAttemptService(attemptsRepo, quizRepo, new EventEmitter2(), new QuizGradingService()),
      new GetAttemptService(attemptsRepo),
      new GetMyAttemptsService(attemptsRepo),
      { execute: jest.fn() } as any,
    );
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('passes the real role and allows preview lessons for IDE runs', async () => {
    jest.spyOn(CodeExecution, 'countDocuments').mockResolvedValue(0);
    const accessError = new Error('stop after access check');
    const accessSpy = jest.fn().mockRejectedValue(accessError);

    await expect(
      new CodeExecutionService({ countFreeRunsToday: jest.fn().mockResolvedValue(0) } as any, {
        assertLessonViewAccess: accessSpy,
      } as any).executeCode(
        '507f1f77bcf86cd799439011',
        {
          lessonId: '507f1f77bcf86cd799439012',
          sourceCode: 'console.log("ok")',
          language: 'javascript',
        },
        'ADMIN',
      )
    ).rejects.toBe(accessError);

    expect(accessSpy).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439012',
      { id: '507f1f77bcf86cd799439011', role: 'ADMIN' }
    );
  });

  it('returns null when the student has not enrolled in a course', async () => {
    const repo = { findByUserAndCourse: jest.fn().mockResolvedValue(null) } as any;
    const service = new GetMyCourseEnrollmentService(repo);

    await expect(
      service.execute(
        '507f1f77bcf86cd799439011',
        '507f1f77bcf86cd799439012'
      )
    ).resolves.toBeNull();
  });

  it('keeps premium enrollment blocked for free students', async () => {
    const course = CourseEntity.fromPersistence({
      id: '507f1f77bcf86cd799439012',
      title: 'Premium Course',
      slug: 'premium-course',
      description: 'Premium course',
      language: 'javascript',
      level: 'BEGINNER',
      tags: [],
      isPremium: true,
      price: 10,
      status: 'published',
      prerequisites: [],
      prerequisiteThreshold: 80,
      estimatedDuration: 0,
      totalLessons: 0,
      totalEnrollments: 0,
      averageRating: 0,
      totalReviews: 0,
    });
    const service = new EnrollInCourseService(
      { findByUserAndCourse: jest.fn() } as any,
      { findById: jest.fn().mockResolvedValue(course), incrementEnrollmentCount: jest.fn() } as any,
      { countCourseLessons: jest.fn() } as any,
      { hasActivePremium: jest.fn().mockResolvedValue(false) } as any,
    );

    await expect(
      service.execute(
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
      new CreateCommentService({} as any, accessPort).execute('507f1f77bcf86cd799439011', 'STUDENT', {
        targetType: 'COURSE',
        targetId: '507f1f77bcf86cd799439012',
        content: 'premium course comment',
      }),
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
      new MongoEnrollmentRepository().listByUser('507f1f77bcf86cd799439011')
    ).resolves.toEqual([
      expect.objectContaining({
        _id: 'valid',
        courseId: 'course',
      }),
    ]);
  });

  it('returns only the most recently updated note for a lesson', async () => {
    const latest = { _id: 'latest-note', noteText: 'Current note' };
    const sort = jest.fn().mockResolvedValue(latest);
    jest.spyOn(Note, 'findOne').mockReturnValue({ sort } as never);

    await expect(
      new MongoNoteRepository().findLatestByLesson(
        '507f1f77bcf86cd799439011',
        '507f1f77bcf86cd799439012',
      )
    ).resolves.toEqual(latest);
    expect(sort).toHaveBeenCalledWith({ updatedAt: -1 });
  });

  it('handles course.completed with certificate and XP side effects', async () => {
    const certificateSpy = jest
      .spyOn(CertificatesService, 'issueCertificate')
      .mockResolvedValue({ _id: 'certificate' } as never);
    jest.spyOn(NotificationsService, 'sendNotification').mockResolvedValue({} as never);

    // TODO DEV2: assert qua EventEmitter2 (GamificationRewardsService has been removed)
    // TODO DEV4: LeaderboardService.invalidateCache removed — leaderboard uses @OnEvent now

    await EnrollmentCompletionPublisher.publishCourseCompleted({
      userId: '507f1f77bcf86cd799439011',
      courseId: '507f1f77bcf86cd799439012',
      progressPercent: 100,
      totalLessons: 1,
      completedLessons: 1,
    });

    expect(certificateSpy).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      '507f1f77bcf86cd799439012',
    );
    // TODO DEV2: assert qua EventEmitter2
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
    jest.spyOn(Quiz, 'findById').mockReturnValue({ exec: jest.fn().mockResolvedValue(quiz) } as never);
    jest.spyOn(QuizAttempt, 'create').mockImplementation(async (data: any) => ({ _id: 'attempt-1', ...data }) as never);
    jest.spyOn(UserStats, 'findOne').mockResolvedValue(null);
    jest.spyOn(Notification, 'create').mockResolvedValue({} as never);

    const result = await createQuizAttemptsService().submitAttempt('student', 'quiz', {
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
    jest.spyOn(Quiz, 'findById').mockReturnValue({ exec: jest.fn().mockResolvedValue(quiz) } as never);
    jest.spyOn(QuizAttempt, 'create').mockImplementation(async (data: any) => ({ _id: 'attempt-1', ...data }) as never);

    const result = await createQuizAttemptsService().submitAttempt('student', 'quiz', {
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
    jest.spyOn(Quiz, 'findById').mockReturnValue({ exec: jest.fn().mockResolvedValue(quiz) } as never);
    jest.spyOn(QuizAttempt, 'create').mockImplementation(async (data: any) => ({ _id: 'attempt-1', ...data }) as never);
    jest.spyOn(UserStats, 'findOne').mockResolvedValue(null);
    jest.spyOn(Notification, 'create').mockResolvedValue({} as never);

    // 1 minute ago
    const startTime = new Date(Date.now() - 60 * 1000).toISOString();
    const result = await createQuizAttemptsService().submitAttempt('507f1f77bcf86cd799439011', 'quiz', {
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
    jest.spyOn(Quiz, 'findById').mockReturnValue({ exec: jest.fn().mockResolvedValue(quiz) } as never);
    jest.spyOn(QuizAttempt, 'create').mockImplementation(async (data: any) => ({ _id: 'attempt-1', ...data }) as never);
    jest.spyOn(UserStats, 'findOne').mockResolvedValue(null);
    jest.spyOn(Notification, 'create').mockResolvedValue({} as never);

    // 11 minutes ago (exceeded 10 mins + 15s buffer)
    const startTime = new Date(Date.now() - 11 * 60 * 1000).toISOString();
    const result = await createQuizAttemptsService().submitAttempt('507f1f77bcf86cd799439011', 'quiz', {
      'question-a': 1,
    }, startTime);

    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
    expect(result.isTimeout).toBe(true);
  });

  it('retrieves user quiz attempts history successfully', async () => {
    const mockAttempts = [{
      _id: 'attempt-1',
      quizId: 'quiz',
      userId: '507f1f77bcf86cd799439011',
      score: 100,
      answers: {},
      passed: true,
    }];
    const execMock = jest.fn().mockResolvedValue(mockAttempts);
    const sortMock = jest.fn().mockReturnValue({ exec: execMock });
    jest.spyOn(QuizAttempt, 'find').mockReturnValue({ sort: sortMock } as never);

    const result = await createQuizAttemptsService().getMyAttempts('507f1f77bcf86cd799439011');
    expect(result[0].toProps()).toMatchObject({ id: 'attempt-1', score: 100 });
    expect(QuizAttempt.find).toHaveBeenCalledWith({ userId: '507f1f77bcf86cd799439011' });
  });

  it('retrieves specific user quiz attempt by id successfully', async () => {
    const mockAttempt = {
      _id: 'attempt-1',
      quizId: 'quiz',
      userId: '507f1f77bcf86cd799439011',
      score: 100,
      answers: {},
      passed: true,
    };
    const execMock = jest.fn().mockResolvedValue(mockAttempt);
    jest.spyOn(QuizAttempt, 'findOne').mockReturnValue({ exec: execMock } as never);

    const result = await createQuizAttemptsService().getAttemptById('507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012');
    expect(result.toProps()).toMatchObject({ id: 'attempt-1', score: 100 });
    expect(QuizAttempt.findOne).toHaveBeenCalledWith({ _id: '507f1f77bcf86cd799439012', userId: '507f1f77bcf86cd799439011' });
  });
});
