import { BookmarkEntity, BookmarkProps } from '../../domain/entities/bookmark.entity';
import { IBookmark } from '../../models/bookmark.model';

const idOf = (value: any): string | undefined => {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (value._id) return String(value._id);
  if (value.id) return String(value.id);
  return String(value);
};

export class BookmarkMapper {
  static toEntity(doc: IBookmark | any): BookmarkEntity {
    return BookmarkEntity.fromPersistence(this.toProps(doc));
  }

  static toProps(doc: IBookmark | any): BookmarkProps {
    return {
      id: String(doc._id ?? doc.id ?? ''),
      userId: String(idOf(doc.userId) ?? ''),
      targetType: doc.targetType,
      targetId: String(idOf(doc.targetId) ?? ''),
      title: String(doc.title ?? ''),
      thumbnailUrl: doc.thumbnailUrl,
      anchorText: doc.anchorText,
      position: doc.position,
      note: doc.note,
      folder: doc.folder,
      tags: doc.tags ?? [],
      status: doc.status ?? 'active',
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  static toPersistence(entity: BookmarkEntity): Record<string, any> {
    const props = entity.toProps();
    return {
      userId: props.userId,
      targetType: props.targetType,
      targetId: props.targetId,
      title: props.title,
      thumbnailUrl: props.thumbnailUrl,
      anchorText: props.anchorText,
      position: props.position,
      note: props.note,
      folder: props.folder,
      tags: props.tags,
      status: props.status,
    };
  }
}
