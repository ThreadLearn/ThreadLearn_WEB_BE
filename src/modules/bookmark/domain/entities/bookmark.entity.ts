import { BadRequestError } from '../../../../common/custom-error';

export type BookmarkTargetType = 'COURSE' | 'LESSON';
export type BookmarkStatus = 'active' | 'deleted';

export interface BookmarkProps {
  id: string;
  userId: string;
  targetType: BookmarkTargetType;
  targetId: string;
  title: string;
  thumbnailUrl?: string;
  anchorText?: string;
  position?: number;
  note?: string;
  folder?: string;
  tags: string[];
  status: BookmarkStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export class BookmarkEntity {
  private constructor(private readonly props: BookmarkProps) {}

  static fromPersistence(props: BookmarkProps): BookmarkEntity {
    return new BookmarkEntity({ ...props, tags: [...props.tags] });
  }

  static createNew(input: Omit<BookmarkProps, 'id' | 'status' | 'tags'> & { tags?: string[] }): BookmarkEntity {
    if (!input.title?.trim()) throw new BadRequestError('title is required.');
    return new BookmarkEntity({
      ...input,
      id: '',
      title: input.title.trim(),
      tags: input.tags ?? [],
      status: 'active',
    });
  }

  get id(): string {
    return this.props.id;
  }

  applyPatch(patch: Partial<Pick<BookmarkProps, 'title' | 'thumbnailUrl' | 'anchorText' | 'position' | 'note' | 'folder' | 'tags'>>): void {
    if (patch.title !== undefined) this.props.title = patch.title;
    if (patch.thumbnailUrl !== undefined) this.props.thumbnailUrl = patch.thumbnailUrl;
    if (patch.anchorText !== undefined) this.props.anchorText = patch.anchorText;
    if (patch.position !== undefined) this.props.position = patch.position;
    if (patch.note !== undefined) this.props.note = patch.note;
    if (patch.folder !== undefined) this.props.folder = patch.folder;
    if (patch.tags !== undefined) this.props.tags = patch.tags;
  }

  softDelete(): void {
    this.props.status = 'deleted';
  }

  toProps(): BookmarkProps {
    return { ...this.props, tags: [...this.props.tags] };
  }
}
