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
        sessionId: doc.sessionId?.toString(),
        startedAt: doc.startedAt,
        // Older attempts predate the completedAt field. Their immutable
        // creation timestamp is the best available completion time.
        completedAt: doc.completedAt ?? doc.createdAt,
        durationSeconds: doc.durationSeconds,
        gradedAt: doc.gradedAt,
        reviewQuestions: doc.reviewQuestions?.map((question: any) => ({
          sourceQuestionId: question.sourceQuestionId.toString(),
          questionText: question.questionText,
          options: question.options.map((option: any) => ({ optionId: option.optionId, text: option.text })),
          selectedOptionIndex: question.selectedOptionIndex,
          selectedOptionId: question.selectedOptionId,
          correctOptionIndex: question.correctOptionIndex,
          correctOptionId: question.correctOptionId,
          isCorrect: question.isCorrect,
          explanation: question.explanation,
        })),
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
      sessionId: props.sessionId,
      startedAt: props.startedAt,
      completedAt: props.completedAt,
      durationSeconds: props.durationSeconds,
      gradedAt: props.gradedAt,
      reviewQuestions: props.reviewQuestions?.map((question) => ({
        ...question,
        sourceQuestionId: question.sourceQuestionId,
        options: question.options.map((option) => ({ ...option })),
      })),
    };
  }
}
