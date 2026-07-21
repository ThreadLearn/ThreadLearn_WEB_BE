import { BadRequestError } from '../../../../common/custom-error';

export interface NoteProps {
  id: string;
  userId: string;
  lessonId: string;
  noteText: string;
  codeSnippet?: string;
  anchorText?: string;
  anchorStart?: number;
  anchorEnd?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export class NoteEntity {
  private constructor(private readonly props: NoteProps) {}

  static fromPersistence(props: NoteProps): NoteEntity {
    return new NoteEntity({ ...props });
  }

  static createNew(input: {
    userId: string;
    lessonId: string;
    noteText: string;
    codeSnippet?: string;
    anchorText?: string;
    anchorStart?: number;
    anchorEnd?: number;
  }): NoteEntity {
    if (!input.noteText?.trim()) throw new BadRequestError('noteText is required.');
    return new NoteEntity({
      id: '',
      userId: input.userId,
      lessonId: input.lessonId,
      noteText: input.noteText.trim(),
      codeSnippet: input.codeSnippet,
      anchorText: input.anchorText?.trim() || undefined,
      anchorStart: input.anchorStart,
      anchorEnd: input.anchorEnd,
    });
  }

  get id(): string {
    return this.props.id;
  }

  applyPatch(input: {
    noteText?: string;
    content?: string;
    codeSnippet?: string;
    anchorText?: string;
    anchorStart?: number;
    anchorEnd?: number;
  }): void {
    const nextText = input.noteText ?? input.content;
    if (nextText !== undefined) {
      if (!nextText.trim()) throw new BadRequestError('noteText is required.');
      this.props.noteText = nextText.trim();
    }
    if (input.codeSnippet !== undefined) this.props.codeSnippet = input.codeSnippet;
    if (input.anchorText !== undefined)
      this.props.anchorText = input.anchorText.trim() || undefined;
    if (input.anchorStart !== undefined) this.props.anchorStart = input.anchorStart;
    if (input.anchorEnd !== undefined) this.props.anchorEnd = input.anchorEnd;
  }

  toProps(): NoteProps {
    return { ...this.props };
  }
}
