import { AggregateRoot } from '../../../../shared/domain/aggregate-root';
import { Question } from '../entities/question.entity';

interface QuizProps {
  title: string;
  lessonId: string;
  passingScorePercent: number;
  xpReward: number;
  timeLimitSeconds?: number;
  questions: Question[];
}

export class Quiz extends AggregateRoot<QuizProps> {
  private constructor(props: QuizProps, id?: string) {
    super(props, id);
  }

  get title(): string {
    return this.props.title;
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

  public addQuestion(question: Question): void {
    this.props.questions.push(question);
  }

  public removeQuestion(questionId: string): void {
    this.props.questions = this.props.questions.filter(q => q.id !== questionId);
  }

  public static create(props: QuizProps, id?: string): Quiz {
    if (!props.title || props.title.trim() === '') {
      throw new Error('Quiz title cannot be empty');
    }
    if (!props.lessonId) {
      throw new Error('Quiz must be linked to a lesson');
    }
    if (props.passingScorePercent < 1 || props.passingScorePercent > 100) {
      throw new Error('Passing score percent must be between 1 and 100');
    }
    if (props.xpReward < 0) {
      throw new Error('XP reward cannot be negative');
    }
    return new Quiz(props, id);
  }
}
