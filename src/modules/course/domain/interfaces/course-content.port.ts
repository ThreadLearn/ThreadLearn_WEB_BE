/**
 * PORT cross-aggregate: Course cần đọc Section/Lesson (thuộc aggregate khác)
 * cho màn chi tiết và rule publish — nhưng KHÔNG được import model Lesson/Section
 * vào domain/application. Đi qua port này; adapter ở infrastructure mới chạm model.
 */
export interface CourseContentSnapshot {
  sections: unknown[];
  lessons: unknown[];
}

export interface ICourseContentPort {
  /** Lấy sections + lessons (đã bỏ nội dung markdown nặng) để dựng màn chi tiết. */
  getContent(courseId: string): Promise<CourseContentSnapshot>;
  /** Đếm số lesson đang active — phục vụ rule publish của CourseEntity. */
  countActiveLessons(courseId: string): Promise<number>;
  /** Đếm lại lesson active và ghi vào `course.totalLessons`. Trả về số đếm mới. */
  refreshLessonCount(courseId: string): Promise<number>;
}

/** DI token cho `ICourseContentPort`. */
export const COURSE_CONTENT_PORT = Symbol('COURSE_CONTENT_PORT');
