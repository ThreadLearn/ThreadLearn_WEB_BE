import { BaseEntity } from '../../../../shared/domain/base.entity';
import { DomainError, ErrorCode } from '../../../../shared/errors/error-codes';

export interface QuestionProps {
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
}

export class Question extends BaseEntity<QuestionProps> {
  private constructor(props: QuestionProps, id?: string) {
    super(props, id);
  }

  // ─── Factories ────────────────────────────────────────────

  static create(props: QuestionProps, id?: string): Question {
    Question.validate(props);
    return new Question(props, id);
  }

  static fromPersistence(props: QuestionProps, id: string): Question {
    return new Question(props, id);
  }

  // ─── Getters ──────────────────────────────────────────────

  get questionText(): string {
    return this.props.questionText;
  }

  get options(): string[] {
    return this.props.options;
  }

  get correctAnswerIndex(): number {
    return this.props.correctAnswerIndex;
  }

  // ─── Business methods ────────────────────────────────────

  update(input: Partial<QuestionProps>): void {
    const merged: QuestionProps = {
      questionText: input.questionText ?? this.props.questionText,
      options: input.options ?? this.props.options,
      correctAnswerIndex: input.correctAnswerIndex ?? this.props.correctAnswerIndex,
    };
    Question.validate(merged);
    (this.props as QuestionProps).questionText = merged.questionText;
    (this.props as QuestionProps).options = merged.options;
    (this.props as QuestionProps).correctAnswerIndex = merged.correctAnswerIndex;
  }

  // ─── Snapshot ─────────────────────────────────────────────

  toProps(): QuestionProps & { id: string } {
    return {
      id: this.id,
      questionText: this.props.questionText,
      options: [...this.props.options],
      correctAnswerIndex: this.props.correctAnswerIndex,
    };
  }

  // ─── Validation (private) ────────────────────────────────

  private static validate(props: QuestionProps): void {
    if (!props.questionText || props.questionText.trim() === '') {
      throw DomainError.badRequest(ErrorCode.QUIZ_INVALID_INPUT, 'Question text cannot be empty.');
    }
    if (!props.options || props.options.length < 2) {
      throw DomainError.badRequest(ErrorCode.QUIZ_INVALID_INPUT, 'A question must have at least 2 options.');
    }
    if (props.correctAnswerIndex < 0 || props.correctAnswerIndex >= props.options.length) {
      throw DomainError.badRequest(ErrorCode.QUIZ_INVALID_INPUT, 'Correct answer index is out of bounds.');
    }
  }
}
