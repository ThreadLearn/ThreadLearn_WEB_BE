/**
 * PORT đọc bài học cho các module khác (vd: enrollment khi complete lesson).
 * Lessons export port này; module ngoài inject thay vì import model — giữ §0.5 / §6.
 */
export interface LessonCompletionSnapshot {
  id: string;
  courseId: string;
  status: string;
  isLocked: boolean;
  title: string;
}

export interface ILessonReadPort {
  /** Bài để chấm hoàn thành (null nếu không tồn tại / đã xoá). */
  getForCompletion(lessonId: string): Promise<LessonCompletionSnapshot | null>;
  /** Đếm bài "tính vào tiến độ" của course: status NOT IN (deleted, hidden). */
  countCourseLessons(courseId: string): Promise<number>;
}

export const LESSON_READ_PORT = Symbol('LESSON_READ_PORT');
