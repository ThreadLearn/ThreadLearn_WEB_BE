import { BadRequestError, ForbiddenError } from '../../../../common/custom-error';

export type CommentTargetType = 'COURSE' | 'LESSON';
export type CommentStatus = 'active' | 'hidden' | 'deleted';
export type CommentPostType = 'GENERAL' | 'QUESTION' | 'CODE_HELP' | 'CODE_REVIEW' | 'EXPLANATION_REQUEST' | 'CODE_SOLUTION';
export type CommentQuestionStatus = 'OPEN' | 'SOLVED' | 'CLOSED';

export interface CommentProps {
  id: string;
  targetType: CommentTargetType;
  targetId: string;
  lessonId?: string;
  courseId?: string;
  exerciseId?: string;
  lessonVersionId?: string;
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
  helpfulCount?: number;
  replyCount?: number;
  mentionUserIds: string[];
  postType?: CommentPostType;
  questionStatus?: CommentQuestionStatus;
  codeShareId?: string;
  acceptedReplyId?: string;
  learningContext?: { expectedResult?: string; actualResult?: string; tried?: string };
  instructorVerifiedAt?: Date;
  instructorVerifiedBy?: string;
}

export class CommentEntity {
  private constructor(private readonly props: CommentProps) {}

  static fromPersistence(props: CommentProps): CommentEntity {
    return new CommentEntity({ ...props, postType: props.postType ?? 'GENERAL', mentionUserIds: [...props.mentionUserIds] });
  }

  static createNew(input: {
    targetType: CommentTargetType;
    targetId: string;
    userId: string;
    content: string;
    isAnonymous?: boolean;
    courseId?: string;
    lessonId?: string;
    exerciseId?: string;
    lessonVersionId?: string;
    parentId?: string | null;
    mentionUserIds?: string[];
    postType?: CommentPostType;
    codeShareId?: string;
    learningContext?: { expectedResult?: string; actualResult?: string; tried?: string };
  }): CommentEntity {
    if (!input.content?.trim()) throw new BadRequestError('content is required.');
    const postType = input.postType ?? 'GENERAL';
    const isDiscussionQuestion = ['QUESTION', 'CODE_HELP', 'CODE_REVIEW', 'EXPLANATION_REQUEST'].includes(postType);
    return new CommentEntity({
      id: '',
      targetType: input.targetType,
      targetId: input.targetId,
      lessonId: input.lessonId ?? (input.targetType === 'LESSON' ? input.targetId : undefined),
      courseId: input.courseId,
      exerciseId: input.exerciseId,
      lessonVersionId: input.lessonVersionId,
      userId: input.userId,
      parentId: input.parentId ?? null,
      content: input.content.trim(),
      isAnonymous: input.isAnonymous ?? false,
      status: 'active',
      isEdited: false,
      mentionUserIds: input.mentionUserIds ?? [],
      postType,
      questionStatus: input.parentId || !isDiscussionQuestion ? undefined : 'OPEN',
      codeShareId: input.codeShareId,
      learningContext: input.learningContext,
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

  get lessonId(): string | undefined {
    return this.props.lessonId;
  }

  get courseId(): string | undefined {
    return this.props.courseId;
  }

  get exerciseId(): string | undefined {
    return this.props.exerciseId;
  }

  get lessonVersionId(): string | undefined {
    return this.props.lessonVersionId;
  }

  get postType(): CommentPostType {
    return this.props.postType ?? 'GENERAL';
  }

  get codeShareId(): string | undefined {
    return this.props.codeShareId;
  }

  get questionStatus(): CommentQuestionStatus | undefined {
    return this.props.questionStatus;
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
