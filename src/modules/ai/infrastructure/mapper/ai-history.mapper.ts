import { AIHistoryEntity, AIHistoryProps } from '../../domain/entities/ai-history.entity';
import { IAIHistory } from '../../models/ai-history.model';

const idOf = (value: any): string | undefined => {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (value._id) return String(value._id);
  if (value.id) return String(value.id);
  return String(value);
};

export class AIHistoryMapper {
  static toEntity(doc: IAIHistory | any): AIHistoryEntity {
    return AIHistoryEntity.fromPersistence(this.toProps(doc));
  }

  static toProps(doc: IAIHistory | any): AIHistoryProps {
    return {
      id: String(doc._id ?? doc.id ?? ''),
      userId: String(idOf(doc.userId) ?? ''),
      courseId: idOf(doc.courseId),
      lessonId: idOf(doc.lessonId),
      codeExecutionId: idOf(doc.codeExecutionId),
      inputCode: doc.inputCode,
      language: doc.language,
      prompt: doc.prompt,
      response: doc.response,
      suggestions: doc.suggestions ?? [],
      raceConditions: doc.raceConditions ?? [],
      optimizedCode: doc.optimizedCode,
      explanation: doc.explanation,
      tokenUsage: doc.tokenUsage,
      modelName: doc.modelName,
      feedbackRating: doc.feedbackRating,
      status: doc.status ?? 'completed',
      category: doc.category,
      issues: doc.issues ?? [],
      docsUsed: doc.docsUsed ?? [],
      cached: doc.cached ?? false,
      analyzeTimeMs: doc.analyzeTimeMs,
      createdAt: doc.createdAt,
    };
  }

  static toPersistence(entity: AIHistoryEntity): Record<string, any> {
    const props = entity.toProps();
    return {
      userId: props.userId,
      courseId: props.courseId,
      lessonId: props.lessonId,
      codeExecutionId: props.codeExecutionId,
      inputCode: props.inputCode,
      language: props.language,
      prompt: props.prompt,
      response: props.response,
      suggestions: props.suggestions,
      raceConditions: props.raceConditions,
      optimizedCode: props.optimizedCode,
      explanation: props.explanation,
      tokenUsage: props.tokenUsage,
      modelName: props.modelName,
      feedbackRating: props.feedbackRating,
      status: props.status,
      category: props.category,
      issues: props.issues,
      docsUsed: props.docsUsed,
      cached: props.cached,
      analyzeTimeMs: props.analyzeTimeMs,
    };
  }
}
