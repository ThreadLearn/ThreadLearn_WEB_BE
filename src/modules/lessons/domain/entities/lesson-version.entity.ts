export interface LessonVersionProps {
  id: string;
  lessonId: string;
  version: number;
  contentMarkdown: string;
  createdBy?: string;
  createdAt?: Date;
}

/** Bản ghi lịch sử nội dung của 1 bài học (immutable sau khi tạo). */
export class LessonVersionEntity {
  private constructor(private readonly props: LessonVersionProps) {}

  static fromPersistence(props: LessonVersionProps): LessonVersionEntity {
    return new LessonVersionEntity(props);
  }

  static createNew(input: {
    lessonId: string;
    version: number;
    contentMarkdown: string;
    createdBy?: string;
  }): LessonVersionEntity {
    return new LessonVersionEntity({
      id: '',
      lessonId: input.lessonId,
      version: input.version,
      contentMarkdown: input.contentMarkdown ?? '',
      createdBy: input.createdBy,
    });
  }

  get id(): string { return this.props.id; }
  get version(): number { return this.props.version; }

  toProps(): LessonVersionProps {
    return { ...this.props };
  }
}
