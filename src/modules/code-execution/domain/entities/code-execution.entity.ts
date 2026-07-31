export interface CodeExecutionProps {
  id: string;
  userId: string;
  courseId?: string;
  lessonId?: string;
  exerciseId?: string;
  sourceCode: string;
  language: string;
  languageId: number;
  stdin?: string;
  status: string;
  stdout?: string;
  stderr?: string;
  compileOutput?: string;
  outputTruncated?: boolean;
  runtime?: string;
  memory?: number;
  exitCode?: number;
  errorMessage?: string;
  executedAt: Date;
  createdAt?: Date;
}

export class CodeExecutionEntity {
  private constructor(private readonly props: CodeExecutionProps) {}

  static createNew(props: Omit<CodeExecutionProps, 'id' | 'executedAt'> & { executedAt?: Date }): CodeExecutionEntity {
    return new CodeExecutionEntity({ ...props, id: '', executedAt: props.executedAt ?? new Date() });
  }

  static fromPersistence(props: CodeExecutionProps): CodeExecutionEntity {
    return new CodeExecutionEntity({ ...props });
  }

  toProps(): CodeExecutionProps {
    return { ...this.props };
  }
}
