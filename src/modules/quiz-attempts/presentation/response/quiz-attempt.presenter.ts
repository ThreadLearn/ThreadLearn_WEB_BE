import { QuizAttempt } from '../../domain/entities/quiz-attempt.entity';
import { Quiz } from '../../../quiz/domain/entities/quiz.entity';

export class QuizAttemptPresenter {
  static toResponse(attempt: QuizAttempt, quizProps: any = {}) {
    const p = attempt.toProps();
    return {
      _id: p.id,
      id: p.id,
      quizId: p.quizId,
      userId: p.userId,
      score: p.score,
      answers: p.answers,
      passed: p.passed,
      startedAt: p.startedAt,
      completedAt: p.completedAt,
      // Legacy fields mapping
      passingScorePercent: quizProps.passingScorePercent ?? 80,
      xpRewarded: p.passed ? (quizProps.xpReward ?? 100) : 0,
      isTimeout: false, // Could be recalculated or stored if needed
    };
  }

  static toList(attempts: QuizAttempt[]) {
    return attempts.map((a) => QuizAttemptPresenter.toResponse(a));
  }

  /** Lọc quiz response cho học viên (ẩn đáp án) */
  static toStudentQuizResponse(quiz: Quiz) {
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
}
