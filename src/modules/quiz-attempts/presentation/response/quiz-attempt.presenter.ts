import { QuizAttempt } from '../../domain/entities/quiz-attempt.entity';
import { Quiz } from '../../../quiz/domain/entities/quiz.entity';

/** Field quiz tuỳ chọn để bù legacy field khi trình bày 1 attempt. */
interface QuizPropsForAttempt {
  passingScorePercent?: number;
  xpReward?: number;
}

/** Kết quả use-case nộp bài (UC41) — shape do controller trả cho FE. */
interface SubmitAttemptResult {
  attempt: QuizAttempt;
  score: number;
  passed: boolean;
  xpRewarded: number;
  passingScorePercent: number;
  isTimeout: boolean;
}

export class QuizAttemptPresenter {
  static toResponse(attempt: QuizAttempt, quizProps: QuizPropsForAttempt = {}) {
    const p = attempt.toProps();
    const questions = p.reviewQuestions?.map((question) => {
      const selectedOption = question.options.find((option) => option.optionId === question.selectedOptionId);
      const correctOption = question.options.find((option) => option.optionId === question.correctOptionId);
      return {
        sourceQuestionId: question.sourceQuestionId,
        questionText: question.questionText,
        options: question.options,
        selectedOptionIndex: question.selectedOptionIndex,
        selectedOptionId: question.selectedOptionId,
        selectedOptionText: selectedOption?.text,
        correctOptionIndex: question.correctOptionIndex,
        correctOptionId: question.correctOptionId,
        correctOptionText: correctOption?.text,
        isCorrect: question.isCorrect,
        answerStatus: question.selectedOptionId
          ? (question.isCorrect ? 'correct' : 'incorrect')
          : 'unanswered',
        explanation: question.explanation,
      };
    }) ?? [];
    const correctCount = questions.filter((question) => question.isCorrect).length;
    const unansweredCount = questions.filter((question) => question.answerStatus === 'unanswered').length;
    const incorrectCount = Math.max(0, questions.length - correctCount - unansweredCount);
    const durationSeconds = p.durationSeconds ?? (
      p.startedAt && p.completedAt
        ? Math.max(0, Math.floor((p.completedAt.getTime() - p.startedAt.getTime()) / 1000))
        : undefined
    );
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
      durationSeconds,
      gradedAt: p.gradedAt ?? p.completedAt,
      // Legacy fields mapping
      passingScorePercent: p.passingScorePercent ?? quizProps.passingScorePercent ?? 80,
      xpRewarded: p.xpRewarded ?? (p.passed ? (quizProps.xpReward ?? 100) : 0),
      isTimeout: p.isTimeout ?? false,
      attemptStatus: p.isTimeout ? 'timed_out' : 'submitted',
      completionStatus: 'completed',
      gradingStatus: 'graded',
      rewardStatus: (p.xpRewarded ?? 0) > 0 ? 'awarded' : 'not_awarded',
      questionCount: questions.length,
      correctCount,
      incorrectCount,
      unansweredCount,
      reviewUnavailable: questions.length === 0,
      questions,
    };
  }

  static toList(attempts: QuizAttempt[]) {
    return attempts.map((a) => QuizAttemptPresenter.toResponse(a));
  }

  /** UC41 — gom shape response nộp bài về 1 chỗ (controller chỉ gọi, không tự nặn). */
  static toSubmitResult(result: SubmitAttemptResult) {
    return {
      attempt: QuizAttemptPresenter.toResponse(result.attempt),
      score: result.score,
      passed: result.passed,
      xpRewarded: result.xpRewarded,
      passingScorePercent: result.passingScorePercent,
      isTimeout: result.isTimeout,
    };
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
