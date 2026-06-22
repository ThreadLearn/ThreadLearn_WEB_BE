export interface LessonProgressProps {
  userId: string;
  courseId: string;
  lessonId: string;
  isCompleted: boolean;
  completedAt?: Date;
  lastAccessedAt: Date;
}

export class LessonProgressEntity {
  private constructor(private readonly props: LessonProgressProps) {}

  static markCompleted(input: { userId: string; courseId: string; lessonId: string }): LessonProgressEntity {
    const now = new Date();
    return new LessonProgressEntity({
      userId: input.userId,
      courseId: input.courseId,
      lessonId: input.lessonId,
      isCompleted: true,
      completedAt: now,
      lastAccessedAt: now,
    });
  }

  toProps(): LessonProgressProps {
    return { ...this.props };
  }
}
