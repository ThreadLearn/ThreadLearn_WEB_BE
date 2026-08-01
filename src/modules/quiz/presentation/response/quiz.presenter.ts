import { Quiz } from '../../domain/entities/quiz.entity';

/**
 * QuizPresenter — entity → JSON FE.
 * Nơi gom field legacy (passingScore/timeLimit mirror).
 */
export class QuizPresenter {
  /** Admin view — phơi đủ field kể cả correctAnswerIndex */
  static toResponse(quiz: Quiz) {
    const p = quiz.toProps();
    return {
      _id: p.id,
      id: p.id,
      title: p.title,
      description: p.description,
      lessonId: p.lessonId,
      passingScorePercent: p.passingScorePercent,
      passingScore: p.passingScorePercent, // legacy mirror
      xpReward: p.xpReward,
      timeLimitSeconds: p.timeLimitSeconds,
      timeLimit: p.timeLimitSeconds ?? 1800, // legacy mirror
      useQuestionBank: p.useQuestionBank === true,
      randomQuestionCount: p.randomQuestionCount,
      questions: p.questions.map((q) => {
        const qp = q.toProps();
        return {
          _id: qp.id,
          id: qp.id,
          questionText: qp.questionText,
          options: qp.options,
          correctAnswerIndex: qp.correctAnswerIndex,
        };
      }),
    };
  }

  /** Student view — ẩn correctAnswerIndex */
  static toStudentResponse(quiz: Quiz) {
    const p = quiz.toProps();
    return {
      _id: p.id,
      id: p.id,
      title: p.title,
      description: p.description,
      lessonId: p.lessonId,
      passingScorePercent: p.passingScorePercent,
      passingScore: p.passingScorePercent,
      xpReward: p.xpReward,
      timeLimitSeconds: p.timeLimitSeconds,
      timeLimit: p.timeLimitSeconds ?? 1800,
      useQuestionBank: p.useQuestionBank === true,
      randomQuestionCount: p.randomQuestionCount,
      questions: p.questions.map((q) => {
        const qp = q.toProps();
        return {
          _id: qp.id,
          id: qp.id,
          questionText: qp.questionText,
          options: qp.options,
          // correctAnswerIndex ẩn cho student
        };
      }),
    };
  }

  static toList(quizzes: Quiz[]) {
    return quizzes.map((q) => QuizPresenter.toResponse(q));
  }
}
