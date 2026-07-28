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
    anchorStart?: number | null;
    anchorEnd?: number | null;
  }): NoteEntity {
    if (!input.noteText?.trim()) throw new BadRequestError('noteText is required.');
    const props: NoteProps = {
      id: '',
      userId: input.userId,
      lessonId: input.lessonId,
      noteText: input.noteText.trim(),
      codeSnippet: input.codeSnippet,
      anchorText: input.anchorText?.trim() || undefined,
      anchorStart: input.anchorStart ?? undefined,
      anchorEnd: input.anchorEnd ?? undefined,
    };
    this.assertValidAnchorRange(props);
    return new NoteEntity(props);
  }

  get id(): string {
    return this.props.id;
  }

  get lessonId(): string {
    return this.props.lessonId;
  }

  applyPatch(input: {
    noteText?: string;
    content?: string;
    codeSnippet?: string;
    anchorText?: string;
    anchorStart?: number | null;
    anchorEnd?: number | null;
  }): void {
    const next = { ...this.props };
    const nextText = input.noteText ?? input.content;
    if (nextText !== undefined) {
      if (!nextText.trim()) throw new BadRequestError('noteText is required.');
      next.noteText = nextText.trim();
    }
    if (input.codeSnippet !== undefined) next.codeSnippet = input.codeSnippet;
    if (input.anchorText !== undefined)
      next.anchorText = input.anchorText.trim() || undefined;
    if (input.anchorStart !== undefined) next.anchorStart = input.anchorStart ?? undefined;
    if (input.anchorEnd !== undefined) next.anchorEnd = input.anchorEnd ?? undefined;
    NoteEntity.assertValidAnchorRange(next);
    Object.assign(this.props, next);
  }

  private static assertValidAnchorRange(props: Pick<NoteProps, 'anchorStart' | 'anchorEnd'>): void {
    if (
      props.anchorStart !== undefined &&
      props.anchorEnd !== undefined &&
      props.anchorEnd <= props.anchorStart
    ) {
      throw new BadRequestError('anchorEnd must be greater than anchorStart.');
    }
  }

  toProps(): NoteProps {
    return { ...this.props };
  }
}
