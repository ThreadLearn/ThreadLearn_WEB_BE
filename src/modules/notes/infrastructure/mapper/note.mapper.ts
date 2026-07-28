import { NoteEntity, NoteProps } from '../../domain/entities/note.entity';
import { INote } from '../../models/note.model';

const idOf = (value: any): string | undefined => {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (value._id) return String(value._id);
  if (value.id) return String(value.id);
  return String(value);
};

export class NoteMapper {
  static toEntity(doc: INote | any): NoteEntity {
    return NoteEntity.fromPersistence(this.toProps(doc));
  }

  static toProps(doc: INote | any): NoteProps {
    return {
      id: String(doc._id ?? doc.id ?? ''),
      userId: String(idOf(doc.userId) ?? ''),
      lessonId: String(idOf(doc.lessonId) ?? ''),
      noteText: String(doc.noteText ?? ''),
      codeSnippet: doc.codeSnippet,
      anchorText: doc.anchorText,
      anchorStart: doc.anchorStart,
      anchorEnd: doc.anchorEnd,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  static toPersistence(note: NoteEntity): Record<string, any> {
    const props = note.toProps();
    return {
      userId: props.userId,
      lessonId: props.lessonId,
      noteText: props.noteText,
      codeSnippet: props.codeSnippet,
      anchorText: props.anchorText,
      anchorStart: props.anchorStart,
      anchorEnd: props.anchorEnd,
    };
  }

  static formatView(doc: INote | any) {
    const props = this.toProps(doc);
    const lesson = doc.lessonId;
    const hasPopulatedLesson = lesson && typeof lesson === 'object' && lesson.title !== undefined;

    return {
      _id: props.id,
      userId: props.userId,
      lessonId: props.lessonId,
      noteText: props.noteText,
      codeSnippet: props.codeSnippet,
      anchorText: props.anchorText,
      anchorStart: props.anchorStart,
      anchorEnd: props.anchorEnd,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
      lesson: hasPopulatedLesson
        ? {
            _id: String(lesson._id),
            title: String(lesson.title),
            courseId: String(idOf(lesson.courseId) ?? ''),
          }
        : undefined,
    };
  }
}
