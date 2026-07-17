export interface AIIssue {
  patternId: string;
  lineRange: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  fix: string;
}

export interface AIKnowledgeDoc {
  id: string;
  title: string;
  category?: string;
  score?: number;
}

export interface AIHistoryProps {
  id: string;
  userId: string;
  courseId?: string;
  lessonId?: string;
  codeExecutionId?: string;
  inputCode?: string;
  language?: string;
  prompt: string;
  response: string;
  suggestions: string[];
  raceConditions: string[];
  optimizedCode?: string;
  explanation?: string;
  tokenUsage?: number;
  modelName?: string;
  feedbackRating?: number;
  status: string;
  category: string;
  issues: AIIssue[];
  docsUsed: AIKnowledgeDoc[];
  cached?: boolean;
  createdAt?: Date;
}

export class AIHistoryEntity {
  private constructor(private readonly props: AIHistoryProps) {}

  static createNew(props: Omit<AIHistoryProps, 'id' | 'status'> & { status?: string }): AIHistoryEntity {
    return new AIHistoryEntity({ ...props, id: '', status: props.status ?? 'completed' });
  }

  static fromPersistence(props: AIHistoryProps): AIHistoryEntity {
    return new AIHistoryEntity({ ...props });
  }

  toProps(): AIHistoryProps {
    return {
      ...this.props,
      suggestions: [...this.props.suggestions],
      raceConditions: [...this.props.raceConditions],
      issues: [...this.props.issues],
      docsUsed: [...this.props.docsUsed],
    };
  }
}
