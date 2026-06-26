import { CodeExecution } from './code-execution/models/code-execution.model';
import { CodeExecutionService } from './code-execution/services/code-execution.service';
import { CommentService } from './comment/services/comment.service';
import { User } from './auth/models/user.model';
import { Course } from './courses/models/course.model';
import { Enrollment } from './enrollments/models/enrollment.model';
import { EnrollmentsService } from './enrollments/services/enrollments.service';
import { Note } from './notes/models/note.model';
import { NotesService } from './notes/services/notes.service';
import { QuizAttemptsService } from './quiz-attempts/application/services/quiz-attempts.facade';
import { SubmitAttemptService } from './quiz-attempts/application/services/submit-attempt.service';
import { GetAttemptService } from './quiz-attempts/application/services/get-attempt.service';
import { GetMyAttemptsService } from './quiz-attempts/application/services/get-my-attempts.service';
import { LearningAccessService } from '../shared/application/learning-access/learning-access.service';
import { EnrollmentCompletionPublisher } from './enrollments/application/events/enrollment-completion.publisher';
import { CertificatesService } from './certificates/services/certificates.service';
import { GamificationRewardsService } from './gamification/services/gamification-rewards.service';
import { LeaderboardService } from './leaderboard/services/leaderboard.service';
import { NotificationsService } from './notifications/services/notifications.service';
import { DomainEventPublisher } from '../shared/application/events/domain-event.publisher';

describe('reported bug regressions', () => {
  const createQuizAttemptsService = (options: {
    quiz?: any;
    attempts?: any[];
    attempt?: any;
  } = {}) => {
    const quiz = options.quiz
      ? {
          ...options.quiz,
          title: options.quiz.title ?? 'Quiz',
          passingScorePercent: options.quiz.passingScorePercent ?? options.quiz.passingScore,
          timeLimitSeconds: options.quiz.timeLimitSeconds ?? options.quiz.timeLimit,
          questions: (options.quiz.questions ?? []).map((question: any) => ({
            ...question,
            id: question.id ?? question._id,
          })),
        }
      : null;

    const quizRepo = {
      findById: jest.fn().mockResolvedValue(quiz),
    };
    const attemptRepo = {
      create: jest.fn().mockImplementation(async (entity) => entity),
      findByUser: jest.fn().mockResolvedValue(options.attempts ?? []),
      findByIdAndUser: jest.fn().mockResolvedValue(options.attempt ?? null),
      deleteById: jest.fn().mockResolvedValue(undefined),
    };
    const eventPublisher = {
      publish: jest.fn(),
      subscribe: jest.fn(),
    } as unknown as DomainEventPublisher;

    return {
      service: new QuizAttemptsService(
        new SubmitAttemptService(attemptRepo as never, quizRepo as never, eventPublisher),
        new GetAttemptService(attemptRepo as never),
        new GetMyAttemptsService(attemptRepo as never),
      ),
      attemptRepo,
      quizRepo,
      eventPublisher,
    };
  };

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

  it('handles course.completed with certificate and XP side effects', async () => {
    const certificateSpy = jest
      .spyOn(CertificatesService, 'issueCertificate')
      .mockResolvedValue({ _id: 'certificate' } as never);
    jest.spyOn(NotificationsService, 'sendNotification').mockResolvedValue({} as never);
    const rewardSpy = jest
      .spyOn(GamificationRewardsService, 'awardCourseCompletion')
      .mockResolvedValue({ xpRewarded: 500, stats: { xp: 500 } as never });
    jest.spyOn(LeaderboardService, 'invalidateCache').mockResolvedValue(undefined);

    const result = await EnrollmentCompletionPublisher.publishCourseCompleted({
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
    expect(rewardSpy).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
    expect(result).toEqual({ xpRewarded: 500, stats: { xp: 500 } });
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
    const { service } = createQuizAttemptsService({ quiz });
    const result = await service.submitAttempt('student', 'quiz', {
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
    const { service } = createQuizAttemptsService({ quiz });
    const result = await service.submitAttempt('student', 'quiz', {
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
    // 1 minute ago
    const startTime = new Date(Date.now() - 60 * 1000).toISOString();
    const { service } = createQuizAttemptsService({ quiz });
    const result = await service.submitAttempt('507f1f77bcf86cd799439011', 'quiz', {
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
    // 11 minutes ago (exceeded 10 mins + 15s buffer)
    const startTime = new Date(Date.now() - 11 * 60 * 1000).toISOString();
    const { service } = createQuizAttemptsService({ quiz });
    const result = await service.submitAttempt('507f1f77bcf86cd799439011', 'quiz', {
      'question-a': 1,
    }, startTime);

    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
    expect(result.isTimeout).toBe(true);
  });

  it('retrieves user quiz attempts history successfully', async () => {
    const mockAttempts = [{ _id: 'attempt-1', score: 100 }];

    const { service, attemptRepo } = createQuizAttemptsService({ attempts: mockAttempts });
    const result = await service.getMyAttempts('507f1f77bcf86cd799439011');
    expect(result).toEqual(mockAttempts);
    expect(attemptRepo.findByUser).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
  });

  it('retrieves specific user quiz attempt by id successfully', async () => {
    const mockAttempt = { _id: 'attempt-1', userId: '507f1f77bcf86cd799439011', score: 100 };

    const { service, attemptRepo } = createQuizAttemptsService({ attempt: mockAttempt });
    const result = await service.getAttemptById('507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012');
    expect(result).toEqual(mockAttempt);
    expect(attemptRepo.findByIdAndUser).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439012',
      '507f1f77bcf86cd799439011',
    );
  });
});
