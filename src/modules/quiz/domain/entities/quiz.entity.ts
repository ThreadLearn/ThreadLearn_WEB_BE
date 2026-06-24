import { AggregateRoot } from '../../../../shared/domain/aggregate-root';
import { DomainError, ErrorCode } from '../../../../shared/errors/error-codes';
import { Question, QuestionProps } from './question.entity';

export interface QuizProps {
  title: string;
  description?: string;
  lessonId: string;
  passingScorePercent: number;
  xpReward: number;
  timeLimitSeconds?: number;
  questions: Question[];
  isDeleted?: boolean;
  deletedAt?: Date;
}

export class Quiz extends AggregateRoot<QuizProps> {
  private constructor(props: QuizProps, id?: string) {
    super(props, id);
  }

  // ─── Factories ────────────────────────────────────────────

  static createNew(input: {
    title: string;
    description?: string;
    lessonId: string;
    passingScorePercent?: number;
    xpReward?: number;
    timeLimitSeconds?: number;
    questions: QuestionProps[];
  }): Quiz {
    if (!input.title || input.title.trim() === '') {
      throw DomainError.badRequest(ErrorCode.QUIZ_INVALID_INPUT, 'Quiz title cannot be empty.');
    }
    if (!input.lessonId) {
      throw DomainError.badRequest(ErrorCode.QUIZ_INVALID_INPUT, 'Quiz must be linked to a lesson.');
    }

    const passingScorePercent = input.passingScorePercent ?? 80;
    if (passingScorePercent < 1 || passingScorePercent > 100) {
      throw DomainError.badRequest(ErrorCode.QUIZ_INVALID_INPUT, 'Passing score percent must be between 1 and 100.');
    }

    const xpReward = input.xpReward ?? 100;
    if (xpReward < 0) {
      throw DomainError.badRequest(ErrorCode.QUIZ_INVALID_INPUT, 'XP reward cannot be negative.');
    }

    if (!input.questions || input.questions.length < 1) {
      throw DomainError.badRequest(ErrorCode.QUIZ_INVALID_INPUT, 'Quiz must have at least 1 question.');
    }

    const questions = input.questions.map((q) => Question.create(q));

    return new Quiz(
      {
        title: input.title.trim(),
        description: input.description,
        lessonId: input.lessonId,
        passingScorePercent,
        xpReward,
        timeLimitSeconds: input.timeLimitSeconds,
        questions,
        isDeleted: false,
      },
    );
  }

  static fromPersistence(props: QuizProps, id: string): Quiz {
    return new Quiz(props, id);
  }

  // ─── Getters ──────────────────────────────────────────────

  get title(): string {
    return this.props.title;
  }

  get description(): string | undefined {
    return this.props.description;
  }

  get lessonId(): string {
    return this.props.lessonId;
  }

  get passingScorePercent(): number {
    return this.props.passingScorePercent;
  }

  get xpReward(): number {
    return this.props.xpReward;
  }

  get timeLimitSeconds(): number | undefined {
    return this.props.timeLimitSeconds;
  }

  get questions(): Question[] {
    return this.props.questions;
  }

  get isDeleted(): boolean {
    return this.props.isDeleted === true;
  }

  get deletedAt(): Date | undefined {
    return this.props.deletedAt;
  }

  // ─── Legacy alias getters (backward-compat cho quiz-attempts, gỡ ở B2) ──

  /** @deprecated Dùng passingScorePercent. Giữ cho quiz-attempts ko vỡ build. */
  get passingScore(): number {
    return this.props.passingScorePercent;
  }

  /** @deprecated Dùng timeLimitSeconds. Giữ cho quiz-attempts ko vỡ build. */
  get timeLimit(): number {
    return this.props.timeLimitSeconds ?? 1800;
  }

  // ─── Business methods ────────────────────────────────────

  updateDetails(input: {
    title?: string;
    description?: string;
    passingScorePercent?: number;
    xpReward?: number;
    timeLimitSeconds?: number;
  }): void {
    if (input.title !== undefined) {
      if (!input.title.trim()) {
        throw DomainError.badRequest(ErrorCode.QUIZ_INVALID_INPUT, 'Quiz title cannot be empty.');
      }
      (this.props as QuizProps).title = input.title.trim();
    }
    if (input.description !== undefined) {
      (this.props as QuizProps).description = input.description;
    }
    if (input.passingScorePercent !== undefined) {
      if (input.passingScorePercent < 1 || input.passingScorePercent > 100) {
        throw DomainError.badRequest(ErrorCode.QUIZ_INVALID_INPUT, 'Passing score percent must be between 1 and 100.');
      }
      (this.props as QuizProps).passingScorePercent = input.passingScorePercent;
    }
    if (input.xpReward !== undefined) {
      if (input.xpReward < 0) {
        throw DomainError.badRequest(ErrorCode.QUIZ_INVALID_INPUT, 'XP reward cannot be negative.');
      }
      (this.props as QuizProps).xpReward = input.xpReward;
    }
    if (input.timeLimitSeconds !== undefined) {
      (this.props as QuizProps).timeLimitSeconds = input.timeLimitSeconds;
    }
  }

  addQuestion(questionProps: QuestionProps): void {
    const question = Question.create(questionProps);
    this.props.questions.push(question);
  }

  findQuestion(questionId: string): Question {
    const question = this.props.questions.find((q) => q.id === questionId);
    if (!question) {
      throw DomainError.notFound(ErrorCode.QUESTION_NOT_FOUND, 'Question not found in this quiz.');
    }
    return question;
  }

  editQuestion(questionId: string, updates: Partial<QuestionProps>): void {
    const question = this.findQuestion(questionId);
    question.update(updates);
  }

  removeQuestion(questionId: string): void {
    this.findQuestion(questionId); // assert exists
    if (this.props.questions.length <= 1) {
      throw DomainError.badRequest(
        ErrorCode.QUIZ_MIN_QUESTIONS,
        'Cannot delete the last question. A quiz must have at least 1 question.',
      );
    }
    (this.props as QuizProps).questions = this.props.questions.filter((q) => q.id !== questionId);
  }

  softRemove(): void {
    if (this.isDeleted) {
      return;
    }
    (this.props as QuizProps).isDeleted = true;
    (this.props as QuizProps).deletedAt = new Date();
  }

  // ─── Snapshot ─────────────────────────────────────────────

  toProps(): QuizProps & { id: string } {
    return {
      id: this.id,
      title: this.props.title,
      description: this.props.description,
      lessonId: this.props.lessonId,
      passingScorePercent: this.props.passingScorePercent,
      xpReward: this.props.xpReward,
      timeLimitSeconds: this.props.timeLimitSeconds,
      questions: this.props.questions,
      isDeleted: this.props.isDeleted,
      deletedAt: this.props.deletedAt,
    };
  }
}
