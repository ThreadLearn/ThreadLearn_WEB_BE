import { ErrorCode } from '../../../../shared/errors/error-codes';
import { Quiz } from '../../domain/entities/quiz.entity';
import { IQuizRepository } from '../../domain/interfaces/quiz.repository';
import { DeleteQuizService } from './delete-quiz.service';

describe('DeleteQuizService', () => {
  const buildQuiz = () =>
    Quiz.fromPersistence(
      {
        title: 'Admin Quiz',
        lessonId: '665f1b2c3d4e5f6a7b8c9d0e',
        passingScorePercent: 80,
        xpReward: 100,
        timeLimitSeconds: 300,
        questions: [],
        isDeleted: false,
      },
      '665f1b2c3d4e5f6a7b8c9d0f',
    );

  const buildRepo = (quiz: Quiz | null): jest.Mocked<IQuizRepository> => ({
    findById: jest.fn().mockResolvedValue(quiz),
    findByLessonId: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(async (entity: Quiz) => entity),
  });

  it('soft removes an active quiz and persists it through the repository', async () => {
    const quiz = buildQuiz();
    const repo = buildRepo(quiz);
    const service = new DeleteQuizService(repo);

    const result = await service.execute(quiz.id);

    expect(repo.findById).toHaveBeenCalledWith(quiz.id);
    expect(repo.update).toHaveBeenCalledWith(quiz);
    expect(result.isDeleted).toBe(true);
    expect(result.deletedAt).toBeInstanceOf(Date);
  });

  it('throws not found when the quiz does not exist or is already hidden by the repository', async () => {
    const repo = buildRepo(null);
    const service = new DeleteQuizService(repo);

    await expect(service.execute('missing-quiz')).rejects.toMatchObject({
      code: ErrorCode.QUIZ_NOT_FOUND,
    });
    expect(repo.update).not.toHaveBeenCalled();
  });
});
