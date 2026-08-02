import { BaseEntity } from '../../../../shared/domain/base.entity';
import { DomainError, ErrorCode } from '../../../../shared/errors/error-codes';

export interface QuizAttemptProps {
  quizId: string;
  userId: string;
  score: number;
  answers: Record<string, number>;
  passed: boolean;
  passingScorePercent?: number;
  xpRewarded?: number;
  isTimeout?: boolean;
  sessionId?: string;
  startedAt?: Date;
  completedAt?: Date;
  durationSeconds?: number;
  gradedAt?: Date;
  reviewQuestions?: QuizReviewQuestion[];
}

export interface QuizReviewOption {
  optionId: string;
  text: string;
}

/** Immutable question and answer data used to review a completed attempt. */
export interface QuizReviewQuestion {
  sourceQuestionId: string;
  questionText: string;
  options: QuizReviewOption[];
  selectedOptionIndex?: number;
  selectedOptionId?: string;
  correctOptionIndex: number;
  correctOptionId: string;
  isCorrect: boolean;
  explanation?: string;
}

export interface QuizReviewSourceQuestion {
  id: string;
  questionText: string;
  options: QuizReviewOption[];
  correctAnswerIndex: number;
  explanation?: string;
}

/**
 * Creates a self-contained review snapshot. It must be called before the
 * attempt is persisted, while the session/question snapshot is still known.
 */
export function buildQuizReviewQuestions(
  questions: QuizReviewSourceQuestion[],
  answers: Record<string, number>,
): QuizReviewQuestion[] {
  return questions.map((question, index) => {
    const selectedOptionIndex = answers[question.id] ?? answers[index.toString()];
    const selectedOption = Number.isInteger(selectedOptionIndex)
      ? question.options[selectedOptionIndex]
      : undefined;
    const correctOption = question.options[question.correctAnswerIndex];

    return {
      sourceQuestionId: question.id,
      questionText: question.questionText,
      options: question.options.map((option) => ({ ...option })),
      ...(selectedOption ? {
        selectedOptionIndex,
        selectedOptionId: selectedOption.optionId,
      } : {}),
      correctOptionIndex: question.correctAnswerIndex,
      correctOptionId: correctOption?.optionId ?? '',
      isCorrect: selectedOptionIndex === question.correctAnswerIndex,
      ...(question.explanation ? { explanation: question.explanation } : {}),
    };
  });
}

export class QuizAttempt extends BaseEntity<QuizAttemptProps> {
  private constructor(props: QuizAttemptProps, id?: string) {
    super(props, id);
  }

  // ─── Factories ────────────────────────────────────────────

  static createNew(input: Omit<QuizAttemptProps, 'completedAt'>): QuizAttempt {
    const props: QuizAttemptProps = {
      ...input,
      completedAt: new Date(),
    };
    QuizAttempt.validate(props);
    return new QuizAttempt(props);
  }

  static fromPersistence(props: QuizAttemptProps, id: string): QuizAttempt {
    return new QuizAttempt(props, id);
  }

  // ─── Getters ──────────────────────────────────────────────

  get quizId(): string {
    return this.props.quizId;
  }

  get userId(): string {
    return this.props.userId;
  }

  get score(): number {
    return this.props.score;
  }

  get answers(): Record<string, number> {
    return this.props.answers;
  }

  get passed(): boolean {
    return this.props.passed;
  }

  get startedAt(): Date | undefined {
    return this.props.startedAt;
  }

  get completedAt(): Date | undefined {
    return this.props.completedAt;
  }

  // ─── Snapshot ─────────────────────────────────────────────

  toProps(): QuizAttemptProps & { id: string } {
    return {
      id: this.id,
      quizId: this.props.quizId,
      userId: this.props.userId,
      score: this.props.score,
      answers: { ...this.props.answers },
      passed: this.props.passed,
      passingScorePercent: this.props.passingScorePercent,
      xpRewarded: this.props.xpRewarded,
      isTimeout: this.props.isTimeout,
      sessionId: this.props.sessionId,
      startedAt: this.props.startedAt,
      completedAt: this.props.completedAt,
      durationSeconds: this.props.durationSeconds,
      gradedAt: this.props.gradedAt,
      reviewQuestions: this.props.reviewQuestions?.map((question) => ({
        ...question,
        options: question.options.map((option) => ({ ...option })),
      })),
    };
  }

  // ─── Validation (private) ────────────────────────────────

  private static validate(props: QuizAttemptProps): void {
    if (!props.quizId) {
      throw DomainError.badRequest(ErrorCode.QUIZ_INVALID_INPUT, 'Quiz ID cannot be empty.');
    }
    if (!props.userId) {
      throw DomainError.badRequest(ErrorCode.QUIZ_INVALID_INPUT, 'User ID cannot be empty.');
    }
    if (props.score < 0 || props.score > 100) {
      throw DomainError.badRequest(ErrorCode.QUIZ_INVALID_INPUT, 'Score must be between 0 and 100.');
    }
    if (props.passingScorePercent !== undefined && (props.passingScorePercent < 1 || props.passingScorePercent > 100)) {
      throw DomainError.badRequest(ErrorCode.QUIZ_INVALID_INPUT, 'Passing score percent must be between 1 and 100.');
    }
    if (props.xpRewarded !== undefined && props.xpRewarded < 0) {
      throw DomainError.badRequest(ErrorCode.QUIZ_INVALID_INPUT, 'XP rewarded cannot be negative.');
    }
    if (props.durationSeconds !== undefined && props.durationSeconds < 0) {
      throw DomainError.badRequest(ErrorCode.QUIZ_INVALID_INPUT, 'Duration cannot be negative.');
    }
  }
}
