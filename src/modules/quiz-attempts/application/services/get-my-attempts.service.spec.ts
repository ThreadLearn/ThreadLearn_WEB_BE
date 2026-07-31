import { QuizAttempt } from '../../domain/entities/quiz-attempt.entity';
import {
  IQuizAttemptRepository,
  QuizAttemptPageOptions,
} from '../../domain/interfaces/quiz-attempt.repository';
import { GetMyAttemptsService } from './get-my-attempts.service';

describe('GetMyAttemptsService', () => {
  let repository: jest.Mocked<IQuizAttemptRepository>;
  let service: GetMyAttemptsService;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findByIdAndUser: jest.fn(),
      findBySessionIdAndUser: jest.fn(),
      findByUser: jest.fn(),
      findByUserPaginated: jest.fn(),
      deleteById: jest.fn(),
    };
    service = new GetMyAttemptsService(repository);
  });

  it('keeps the legacy array response path when no pagination query is provided', async () => {
    const attempts = [buildAttempt('attempt-1')];
    repository.findByUser.mockResolvedValue(attempts);

    const result = await service.execute('student-1');

    expect(repository.findByUser).toHaveBeenCalledWith('student-1');
    expect(repository.findByUserPaginated).not.toHaveBeenCalled();
    expect(result).toBe(attempts);
  });

  it('uses the paginated repository path when page or limit is provided', async () => {
    const attempts = [buildAttempt('attempt-2')];
    repository.findByUserPaginated.mockResolvedValue({
      items: attempts,
      total: 12,
      page: 2,
      limit: 5,
      totalPages: 3,
    });

    const result = await service.execute('student-1', { page: 2, limit: 5 });

    expect(repository.findByUser).not.toHaveBeenCalled();
    expect(repository.findByUserPaginated).toHaveBeenCalledWith('student-1', {
      page: 2,
      limit: 5,
    } satisfies QuizAttemptPageOptions);
    expect(result).toEqual({
      items: attempts,
      total: 12,
      page: 2,
      limit: 5,
      totalPages: 3,
    });
  });
});

function buildAttempt(id: string): QuizAttempt {
  return QuizAttempt.fromPersistence({
    quizId: 'quiz-1',
    userId: 'student-1',
    score: 100,
    answers: { 'question-1': 0 },
    passed: true,
    passingScorePercent: 80,
    xpRewarded: 100,
    isTimeout: false,
    startedAt: new Date('2026-07-16T10:00:00.000Z'),
    completedAt: new Date('2026-07-16T10:05:00.000Z'),
  }, id);
}
