import { LessonVersionEntity } from '../../domain/entities/lesson-version.entity';

export interface LessonVersionResponse {
  _id: string;
  id: string;
  lessonId: string;
  version: number;
  contentMarkdown: string;
  createdBy?: string;
  createdAt?: Date;
}

export class LessonVersionPresenter {
  static toResponse(version: LessonVersionEntity): LessonVersionResponse {
    const p = version.toProps();
    return {
      _id: p.id,
      id: p.id,
      lessonId: p.lessonId,
      version: p.version,
      contentMarkdown: p.contentMarkdown,
      createdBy: p.createdBy,
      createdAt: p.createdAt,
    };
  }

  static toList(versions: LessonVersionEntity[]): LessonVersionResponse[] {
    return versions.map((v) => LessonVersionPresenter.toResponse(v));
  }
}
