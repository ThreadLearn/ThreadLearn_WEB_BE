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
      mentionUserIds: (doc.mentionUserIds ?? []).map((id: any) => String(idOf(id) ?? id)),
    };
  }

  static toPersistence(entity: CommentEntity): Record<string, any> {
    const props = entity.toProps();
    return {
      targetType: props.targetType,
      targetId: props.targetId,
      lessonId: props.lessonId,
      courseId: props.courseId,
      userId: props.userId,
      parentId: props.parentId,
      content: props.content,
      isAnonymous: props.isAnonymous,
      status: props.status,
      isEdited: props.isEdited,
      editedAt: props.editedAt,
      deletedAt: props.deletedAt,
      reactionCount: props.reactionCount,
      mentionUserIds: props.mentionUserIds,
    };
  }

  static formatView(comment: any) {
    if (!comment) return null;
    const user = comment.userId;
    const authorId = idOf(user) ?? '';
    const isAnonymous = !!comment.isAnonymous;
    return {
      ...comment,
      userId: authorId,
      isAnonymous,
      user:
        !isAnonymous && user && typeof user === 'object' && user.firstName !== undefined
          ? {
              _id: String(user._id),
              name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'ThreadLearn member',
              avatarUrl: user.avatarUrl ?? null,
            }
          : undefined,
    };
  }
}
