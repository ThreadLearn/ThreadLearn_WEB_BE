import { CommentEntity, CommentProps } from '../../domain/entities/comment.entity';
import { IComment } from '../../models/comment.model';

const idOf = (value: any): string | undefined => {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (value._id) return String(value._id);
  if (value.id) return String(value.id);
  return String(value);
};

const dateOf = (value: any): Date | undefined => (value ? new Date(value) : undefined);

export class CommentMapper {
  static toEntity(doc: IComment | any): CommentEntity {
    return CommentEntity.fromPersistence(this.toProps(doc));
  }

  static toProps(doc: IComment | any): CommentProps {
    return {
      id: String(doc._id ?? doc.id ?? ''),
      targetType: doc.targetType,
      targetId: String(idOf(doc.targetId) ?? ''),
      lessonId: idOf(doc.lessonId),
      courseId: idOf(doc.courseId),
      exerciseId: doc.exerciseId ? String(doc.exerciseId) : undefined,
      lessonVersionId: idOf(doc.lessonVersionId),
      userId: String(idOf(doc.userId) ?? ''),
      parentId: idOf(doc.parentId) ?? null,
      content: String(doc.content ?? ''),
      isAnonymous: !!doc.isAnonymous,
      status: doc.status ?? 'active',
      isEdited: !!doc.isEdited,
      editedAt: dateOf(doc.editedAt),
      createdAt: dateOf(doc.createdAt),
      updatedAt: dateOf(doc.updatedAt),
      deletedAt: dateOf(doc.deletedAt),
      reactionCount: doc.reactionCount,
      helpfulCount: doc.helpfulCount,
      replyCount: doc.replyCount,
      mentionUserIds: (doc.mentionUserIds ?? []).map((id: any) => String(idOf(id) ?? id)),
      postType: doc.postType ?? 'GENERAL',
      questionStatus: doc.questionStatus,
      codeShareId: idOf(doc.codeShareId),
      acceptedReplyId: idOf(doc.acceptedReplyId),
      learningContext: doc.learningContext,
      instructorVerifiedAt: dateOf(doc.instructorVerifiedAt),
      instructorVerifiedBy: idOf(doc.instructorVerifiedBy),
    };
  }

  static toPersistence(entity: CommentEntity): Record<string, any> {
    const props = entity.toProps();
    return {
      targetType: props.targetType,
      targetId: props.targetId,
      lessonId: props.lessonId,
      courseId: props.courseId,
      exerciseId: props.exerciseId,
      lessonVersionId: props.lessonVersionId,
      userId: props.userId,
      parentId: props.parentId,
      content: props.content,
      isAnonymous: props.isAnonymous,
      status: props.status,
      isEdited: props.isEdited,
      editedAt: props.editedAt,
      deletedAt: props.deletedAt,
      reactionCount: props.reactionCount,
      helpfulCount: props.helpfulCount,
      replyCount: props.replyCount,
      mentionUserIds: props.mentionUserIds,
      postType: props.postType,
      questionStatus: props.questionStatus,
      codeShareId: props.codeShareId,
      acceptedReplyId: props.acceptedReplyId,
      learningContext: props.learningContext,
      instructorVerifiedAt: props.instructorVerifiedAt,
      instructorVerifiedBy: props.instructorVerifiedBy,
    };
  }

  static formatView(
    comment: any,
    viewer?: string | { id: string; isAdmin?: boolean; canModerate?: boolean },
  ) {
    if (!comment) return null;
    const raw = typeof comment.toObject === 'function' ? comment.toObject() : comment;
    const id = String(raw._id ?? raw.id ?? '');
    const targetId = String(idOf(raw.targetId) ?? '');
    const lessonId = idOf(raw.lessonId);
    const courseId = idOf(raw.courseId);
    const exerciseId = raw.exerciseId ? String(raw.exerciseId) : undefined;
    const lessonVersionId = idOf(raw.lessonVersionId);
    const parentId = idOf(raw.parentId) ?? null;
    const authorId = idOf(raw.userId) ?? '';
    const viewerId = typeof viewer === 'string' ? viewer : viewer?.id;
    const isAdmin = typeof viewer === 'object' && Boolean(viewer?.isAdmin);
    const canModerate = typeof viewer === 'object' && Boolean(viewer?.canModerate || viewer?.isAdmin);
    const isOwner = Boolean(viewerId && authorId === viewerId);

    if (raw.status === 'deleted') {
      return {
        id,
        targetType: raw.targetType,
        targetId,
        lessonId,
        courseId,
        exerciseId,
        lessonVersionId,
        parentId,
        status: 'deleted' as const,
        content: 'This comment has been deleted.',
        isAnonymous: true,
        isOwner: false,
        postType: raw.postType ?? 'GENERAL',
        questionStatus: raw.questionStatus,
        acceptedReplyId: undefined,
        replyCount: Number(raw.replyCount ?? 0),
        createdAt: dateOf(raw.createdAt),
        updatedAt: dateOf(raw.updatedAt),
        deletedAt: dateOf(raw.deletedAt),
      };
    }

    const user = raw.userId;
    const isAnonymous = !!raw.isAnonymous;
    const view: Record<string, unknown> = {
      id,
      targetType: raw.targetType,
      targetId,
      lessonId,
      courseId,
      exerciseId,
      lessonVersionId,
      parentId,
      content: String(raw.content ?? ''),
      status: raw.status ?? 'active',
      isAnonymous,
      isOwner,
      isEdited: Boolean(raw.isEdited),
      editedAt: dateOf(raw.editedAt),
      createdAt: dateOf(raw.createdAt),
      updatedAt: dateOf(raw.updatedAt),
      reactionCount: Number(raw.reactionCount ?? 0),
      helpfulCount: Number(raw.helpfulCount ?? 0),
      replyCount: Number(raw.replyCount ?? 0),
      postType: raw.postType ?? 'GENERAL',
      questionStatus: raw.questionStatus,
      codeShareId: idOf(raw.codeShareId),
      acceptedReplyId: idOf(raw.acceptedReplyId),
      learningContext: raw.learningContext,
      instructorVerifiedAt: dateOf(raw.instructorVerifiedAt),
      authorLabel: isAnonymous ? 'Anonymous learner' : undefined,
      capabilities: {
        canVerify: canModerate,
        canModerate,
        canAccept: isOwner,
        canEdit: isOwner || isAdmin,
        canDelete: isOwner || isAdmin,
      },
    };

    if (!isAnonymous) {
      view.userId = authorId;
      if (user && typeof user === 'object' && user.firstName !== undefined) {
        view.user = {
          _id: authorId,
          name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'ThreadLearn member',
          avatarUrl: user.avatarUrl ?? null,
        };
      }
      view.instructorVerifiedBy = idOf(raw.instructorVerifiedBy);
    }
    return view;
  }
}
