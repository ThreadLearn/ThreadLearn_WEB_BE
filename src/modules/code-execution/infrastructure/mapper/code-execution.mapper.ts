import { CodeExecutionEntity, CodeExecutionProps } from '../../domain/entities/code-execution.entity';
import { ICodeExecution } from '../../models/code-execution.model';

const idOf = (value: any): string | undefined => {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (value._id) return String(value._id);
  if (value.id) return String(value.id);
  return String(value);
};

export class CodeExecutionMapper {
  static toProps(doc: ICodeExecution | any): CodeExecutionProps {
    return {
      id: String(doc._id ?? doc.id ?? ''),
      userId: String(idOf(doc.userId) ?? ''),
      courseId: idOf(doc.courseId),
      lessonId: idOf(doc.lessonId),
      exerciseId: doc.exerciseId,
      sourceCode: doc.sourceCode,
      language: doc.language,
      languageId: doc.languageId,
      stdin: doc.stdin,
      status: doc.status,
      stdout: doc.stdout,
      stderr: doc.stderr,
      compileOutput: doc.compileOutput,
      outputTruncated: doc.outputTruncated,
      runtime: doc.runtime,
      memory: doc.memory,
      exitCode: doc.exitCode,
      errorMessage: doc.errorMessage,
      executedAt: doc.executedAt ?? new Date(),
      createdAt: doc.createdAt,
    };
  }

  static toEntity(doc: ICodeExecution | any): CodeExecutionEntity {
    return CodeExecutionEntity.fromPersistence(this.toProps(doc));
  }

  static toPersistence(entity: CodeExecutionEntity): Record<string, any> {
    return entity.toProps();
  }
}
