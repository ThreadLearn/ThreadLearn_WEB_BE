import { BadRequestError, ForbiddenError } from '../../../../common/custom-error';

export type CommentTargetType = 'COURSE' | 'LESSON';
export type CommentStatus = 'active' | 'hidden' | 'deleted';

export interface CommentProps {
  id: string;
  targetType: CommentTargetType;
  targetId: string;
  lessonId?: string;
  courseId?: string;
  userId: string;
  parentId?: string | null;
  content: string;
  isAnonymous: boolean;
  status: CommentStatus;
  isEdited: boolean;
  editedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
  reactionCount?: number;
  mentionUserIds: string[];
}

export class CommentEntity {
  private constructor(private readonly props: CommentProps) {}

  static fromPersistence(props: CommentProps): CommentEntity {
    return new CommentEntity({ ...props, mentionUserIds: [...props.mentionUserIds] });
  }

  static createNew(input: {
    targetType: CommentTargetType;
    targetId: string;
    userId: string;
    content: string;
    isAnonymous?: boolean;
    courseId?: string;
    parentId?: string | null;
    mentionUserIds?: string[];
  }): CommentEntity {
    if (!input.content?.trim()) throw new BadRequestError('content is required.');
    return new CommentEntity({
      id: '',
      targetType: input.targetType,
      targetId: input.targetId,
      lessonId: input.targetType === 'LESSON' ? input.targetId : undefined,
      courseId: input.courseId,
      userId: input.userId,
      parentId: input.parentId ?? null,
      content: input.content.trim(),
      isAnonymous: input.isAnonymous ?? false,
      status: 'active',
      isEdited: false,
      mentionUserIds: input.mentionUserIds ?? [],
    });
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get targetType(): CommentTargetType {
    return this.props.targetType;
  }

  get targetId(): string {
    return this.props.targetId;
  }

  get parentId(): string | null | undefined {
    return this.props.parentId;
  }

  ensureCanModify(userId: string, userRole: 'STUDENT' | 'ADMIN'): void {
    if (userRole !== 'ADMIN' && this.props.userId !== userId) {
      throw new ForbiddenError('You can only edit your own comments.');
    }
  }

  edit(content: string): void {
    if (!content?.trim()) throw new BadRequestError('content is required.');
    this.props.content = content.trim();
    this.props.isEdited = true;
    this.props.editedAt = new Date();
  }

  softDelete(userId: string, userRole: 'STUDENT' | 'ADMIN'): void {
    if (userRole !== 'ADMIN' && this.props.userId !== userId) {
      throw new ForbiddenError('You can only delete your own comments.');
    }
    this.props.status = 'deleted';
    this.props.content = '[Comment deleted]';
    this.props.deletedAt = new Date();
  }

  toProps(): CommentProps {
    return { ...this.props, mentionUserIds: [...this.props.mentionUserIds] };
  }
}
