import { BaseEntity } from '../../../../shared/domain/base.entity';

interface QuestionProps {
  questionText: string;
  choices: string[];
  correctAnswerIndex: number;
}

export class Question extends BaseEntity<QuestionProps> {
  private constructor(props: QuestionProps, id?: string) {
    super(props, id);
  }

  get questionText(): string {
    return this.props.questionText;
  }

  get choices(): string {
    return this.props.choices as any; // Allow raw retrieval
  }

  get correctAnswerIndex(): number {
    return this.props.correctAnswerIndex;
  }

  public static create(props: QuestionProps, id?: string): Question {
    if (!props.questionText || props.questionText.trim() === '') {
      throw new Error('Question text cannot be empty');
    }
    if (!props.choices || props.choices.length < 2) {
      throw new Error('A question must have at least 2 choices');
    }
    if (props.correctAnswerIndex < 0 || props.correctAnswerIndex >= props.choices.length) {
      throw new Error('Correct answer index is out of bounds');
    }
    return new Question(props, id);
  }
}
