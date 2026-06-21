import { BaseEntity } from '../../../../shared/domain/base.entity';
import { DomainError, ErrorCode } from '../../../../shared/errors/error-codes';

export interface QuizAttemptProps {
  quizId: string;
  userId: string;
  score: number;
  answers: Record<string, number>;
  passed: boolean;
  startedAt?: Date;
  completedAt?: Date;
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
      startedAt: this.props.startedAt,
      completedAt: this.props.completedAt,
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
  }
}
