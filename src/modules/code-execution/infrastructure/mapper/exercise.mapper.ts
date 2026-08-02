import { ExerciseEntity, ExerciseProps } from '../../domain/entities/exercise.entity';
import { IExercise } from '../../models/exercise.model';

const idOf = (value: any): string | undefined => {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (value._id) return String(value._id);
  if (value.id) return String(value.id);
  return String(value);
};

export class ExerciseMapper {
  static toProps(doc: IExercise | any): ExerciseProps {
    return {
      id: String(doc._id ?? doc.id ?? ''),
      lessonId: String(idOf(doc.lessonId) ?? ''),
      title: doc.title,
      description: doc.description,
      starterCode: doc.starterCode,
      language: doc.language,
      testCases: doc.testCases ?? [],
      totalPoints: doc.totalPoints ?? 0,
      timeLimitMs: doc.timeLimitMs ?? 5000,
      memoryLimitKb: doc.memoryLimitKb ?? 131072,
      status: doc.status ?? 'PUBLISHED',
      deadline: doc.deadline ?? null,
      maxSubmissions: doc.maxSubmissions ?? null,
      createdBy: idOf(doc.createdBy),
      publishedAt: doc.publishedAt,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  static toEntity(doc: IExercise | any): ExerciseEntity {
    return ExerciseEntity.fromPersistence(this.toProps(doc));
  }

  static toPersistence(entity: ExerciseEntity): Record<string, any> {
    const props = entity.toProps();
    return {
      lessonId: props.lessonId,
      title: props.title,
      description: props.description,
      starterCode: props.starterCode,
      language: props.language,
      testCases: props.testCases,
      totalPoints: props.totalPoints,
      timeLimitMs: props.timeLimitMs,
      memoryLimitKb: props.memoryLimitKb,
      status: props.status,
      deadline: props.deadline,
      maxSubmissions: props.maxSubmissions,
      createdBy: props.createdBy,
      publishedAt: props.publishedAt,
    };
  }
}
