import { QuizAttempt } from '../../domain/entities/quiz-attempt.entity';

export class QuizAttemptMapper {
  static toEntity(doc: any): QuizAttempt {
    return QuizAttempt.fromPersistence(
      {
        quizId: doc.quizId.toString(),
        userId: doc.userId.toString(),
        score: doc.score,
        answers: doc.answers,
        passed: doc.passed,
        passingScorePercent: doc.passingScorePercent,
        xpRewarded: doc.xpRewarded,
        isTimeout: doc.isTimeout,
        startedAt: doc.startedAt,
        completedAt: doc.completedAt,
      },
      doc._id.toString(),
    );
  }

  static toPersistence(entity: QuizAttempt): Record<string, any> {
    const props = entity.toProps();
    return {
      quizId: props.quizId,
      userId: props.userId,
      score: props.score,
      answers: props.answers,
      passed: props.passed,
      passingScorePercent: props.passingScorePercent,
      xpRewarded: props.xpRewarded,
      isTimeout: props.isTimeout,
      startedAt: props.startedAt,
      completedAt: props.completedAt,
    };
  }
}
