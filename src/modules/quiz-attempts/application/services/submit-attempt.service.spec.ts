import { EventEmitter2 } from '@nestjs/event-emitter';
import { Quiz } from '../../../quiz/domain/entities/quiz.entity';
import { Question } from '../../../quiz/domain/entities/question.entity';
import { IQuizRepository } from '../../../quiz/domain/interfaces/quiz.repository';
import { QuizAttempt } from '../../domain/entities/quiz-attempt.entity';
import { IQuizAttemptRepository } from '../../domain/interfaces/quiz-attempt.repository';
import { QuizGradingService } from '../../domain/services/quiz-grading.service';
import { DomainEventPublisher } from '../events/domain-event.publisher';
import { SubmitAttemptService } from './submit-attempt.service';

describe('SubmitAttemptService', () => {
  it('persists grading metadata needed by attempt result and history', async () => {
    const quiz = Quiz.fromPersistence(
      {
        title: 'Concurrency Quiz',
        lessonId: 'lesson-1',
        passingScorePercent: 70,
        xpReward: 250,
        timeLimitSeconds: 300,
        questions: [
          Question.create(
            {
              questionText: 'Which answer is safe?',
              options: ['A', 'B'],
              correctAnswerIndex: 1,
            },
            'question-1',
          ),
        ],
      },
      'quiz-1',
    );
    const attemptRepository = new InMemoryQuizAttemptRepository();
    const quizRepository: IQuizRepository = {
      findById: jest.fn().mockResolvedValue(quiz),
      findByLessonId: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    const service = new SubmitAttemptService(
      attemptRepository,
      quizRepository,
      new DomainEventPublisher(new EventEmitter2()),
      new QuizGradingService(),
    );

    const result = await service.execute('student-1', 'quiz-1', { 'question-1': 1 });

    expect(result).toMatchObject({
      score: 100,
      passed: true,
      xpRewarded: 250,
      passingScorePercent: 70,
      isTimeout: false,
    });
    expect(result.attempt.toProps()).toMatchObject({
      passingScorePercent: 70,
      xpRewarded: 250,
      isTimeout: false,
    });
    expect(attemptRepository.created[0].toProps()).toMatchObject({
      passingScorePercent: 70,
      xpRewarded: 250,
      isTimeout: false,
    });
  });
});

class InMemoryQuizAttemptRepository implements IQuizAttemptRepository {
  readonly created: QuizAttempt[] = [];

  async create(entity: QuizAttempt): Promise<QuizAttempt> {
    this.created.push(entity);
    return entity;
  }

  async findByIdAndUser(): Promise<QuizAttempt | null> {
    return null;
  }

  async findByUser(): Promise<QuizAttempt[]> {
    return [];
  }

  async deleteById(): Promise<void> {}
}
