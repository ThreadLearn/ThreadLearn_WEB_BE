import { BadRequestError } from '../../../../common/custom-error';

export interface ExerciseTestCase {
  id?: string;
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
  memoryLimitKb: number;
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED';
  deadline?: Date | null;
  maxSubmissions?: number | null;
  createdBy?: string;
  publishedAt?: Date;
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
  memoryLimitKb?: number;
  status?: 'DRAFT' | 'PUBLISHED' | 'CLOSED';
  deadline?: Date | null;
  maxSubmissions?: number | null;
  createdBy?: string;
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
      totalPoints: (input.testCases ?? []).reduce((sum, testCase) => sum + (testCase.points ?? 1), 0),
      timeLimitMs: input.timeLimitMs ?? 5000,
      memoryLimitKb: input.memoryLimitKb ?? 131072,
      status: input.status ?? 'DRAFT',
      deadline: input.deadline ?? null,
      maxSubmissions: input.maxSubmissions ?? null,
      createdBy: input.createdBy,
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
    if (payload.memoryLimitKb !== undefined) this.props.memoryLimitKb = payload.memoryLimitKb;
    if (payload.status !== undefined) {
      this.props.status = payload.status;
      if (payload.status === 'PUBLISHED' && !this.props.publishedAt) this.props.publishedAt = new Date();
    }
    if (payload.deadline !== undefined) this.props.deadline = payload.deadline;
    if (payload.maxSubmissions !== undefined) this.props.maxSubmissions = payload.maxSubmissions;
    if (payload.testCases) {
      this.props.testCases = payload.testCases.map((tc) => ({
        input: tc.input ?? '',
        expectedOutput: tc.expectedOutput ?? '',
        isHidden: !!tc.isHidden,
        points: tc.points ?? 1,
      }));
      this.props.totalPoints = this.props.testCases.reduce((sum, testCase) => sum + (testCase.points || 0), 0);
    }
  }

  toProps(): ExerciseProps {
    return { ...this.props, testCases: [...this.props.testCases] };
  }
}
