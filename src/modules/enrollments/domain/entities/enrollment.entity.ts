export interface EnrollmentProps {
  id: string;
  userId: string;
  courseId: string;
  progress: number;
  progressPercent: number;
  completedLessons: string[];
  totalLessons: number;
  lastLessonId?: string;
  completed: boolean;
  completedAt?: Date;
  enrolledAt: Date;
  lastAccessedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MarkLessonCompletedResult {
  firstTime: boolean;
  justCompleted: boolean;
}

export class EnrollmentEntity {
  private constructor(private readonly props: EnrollmentProps) {}

  static fromPersistence(props: EnrollmentProps): EnrollmentEntity {
    return new EnrollmentEntity({ ...props, completedLessons: [...props.completedLessons] });
  }

  static createInitial(input: { userId: string; courseId: string; totalLessons: number }): EnrollmentEntity {
    return new EnrollmentEntity({
      id: '',
      userId: input.userId,
      courseId: input.courseId,
      progress: 0,
      progressPercent: 0,
      completedLessons: [],
      totalLessons: input.totalLessons,
      completed: false,
      enrolledAt: new Date(),
      lastAccessedAt: new Date(),
    });
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get courseId(): string {
    return this.props.courseId;
  }

  get completed(): boolean {
    return this.props.completed;
  }

  markLessonCompleted(lessonId: string, totalLessons: number): MarkLessonCompletedResult {
    const firstTime = !this.props.completedLessons.includes(lessonId);
    if (firstTime) this.props.completedLessons.push(lessonId);

    this.props.totalLessons = totalLessons;
    this.props.lastLessonId = lessonId;
    this.props.lastAccessedAt = new Date();
    this.recalculateProgress(this.props.completedLessons.length, totalLessons);

    const justCompleted = this.props.progress >= 100 && !this.props.completed;
    if (justCompleted) {
      this.props.completed = true;
      this.props.completedAt = new Date();
    }

    return { firstTime, justCompleted };
  }

  recalcByCount(count: number, totalLessons: number): { justCompleted: boolean } {
    const wasCompleted = this.props.completed;
    this.props.totalLessons = totalLessons;
    this.recalculateProgress(count, totalLessons);
    if (this.props.progress >= 100) {
      this.props.completed = true;
      if (!this.props.completedAt) this.props.completedAt = new Date();
    }
    return { justCompleted: this.props.completed && !wasCompleted };
  }

  private recalculateProgress(completedCount: number, totalLessons: number): void {
    const progress = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
    this.props.progress = progress;
    this.props.progressPercent = progress;
  }

  toProps(): EnrollmentProps {
    return { ...this.props, completedLessons: [...this.props.completedLessons] };
  }
}
