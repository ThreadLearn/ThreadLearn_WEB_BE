import { BadRequestError } from '../../../../common/custom-error';

export interface ExerciseTestCase {
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  points: number;
}

export interface ExerciseProps {
  id: string;
  lessonId: string;
  title: string;
  description: string;
  starterCode: string;
  language: string;
  testCases: ExerciseTestCase[];
  totalPoints: number;
  timeLimitMs: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ExerciseUpsertPayload {
  lessonId: string;
  title: string;
  description?: string;
  starterCode?: string;
  language: string;
  testCases?: { input?: string; expectedOutput: string; isHidden?: boolean; points?: number }[];
  timeLimitMs?: number;
}

export class ExerciseEntity {
  private constructor(private readonly props: ExerciseProps) {}

  static fromPersistence(props: ExerciseProps): ExerciseEntity {
    return new ExerciseEntity({ ...props, testCases: [...props.testCases] });
  }

  static createNew(input: ExerciseUpsertPayload): ExerciseEntity {
    if (!input.title?.trim()) throw new BadRequestError('title is required.');
    return new ExerciseEntity({
      id: '',
      lessonId: input.lessonId,
      title: input.title,
      description: input.description ?? '',
      starterCode: input.starterCode ?? '',
      language: input.language.toLowerCase(),
      testCases: (input.testCases ?? []).map((tc) => ({
        input: tc.input ?? '',
        expectedOutput: tc.expectedOutput ?? '',
        isHidden: !!tc.isHidden,
        points: tc.points ?? 1,
      })),
      totalPoints: 0,
      timeLimitMs: input.timeLimitMs ?? 5000,
    });
  }

  get id(): string {
    return this.props.id;
  }

  applyPatch(payload: Partial<ExerciseUpsertPayload>): void {
    if (payload.title !== undefined) this.props.title = payload.title;
    if (payload.description !== undefined) this.props.description = payload.description;
    if (payload.starterCode !== undefined) this.props.starterCode = payload.starterCode;
    if (payload.language !== undefined) this.props.language = payload.language.toLowerCase();
    if (payload.timeLimitMs !== undefined) this.props.timeLimitMs = payload.timeLimitMs;
    if (payload.testCases) {
      this.props.testCases = payload.testCases.map((tc) => ({
        input: tc.input ?? '',
        expectedOutput: tc.expectedOutput ?? '',
        isHidden: !!tc.isHidden,
        points: tc.points ?? 1,
      }));
    }
  }

  toProps(): ExerciseProps {
    return { ...this.props, testCases: [...this.props.testCases] };
  }
}
