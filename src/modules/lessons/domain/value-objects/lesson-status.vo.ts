export type LessonType = 'article' | 'video' | 'coding' | 'quiz' | 'assignment' | 'mixed';
export type LessonStatus = 'active' | 'locked' | 'hidden' | 'deleted';

/** Ngưỡng thay đổi nội dung (số ký tự) để tạo version mới của bài học. */
export const VERSION_THRESHOLD_CHARS = 1000;

/** Status được liệt kê khi học viên/khách xem danh sách bài (loại bỏ bài đã xoá). */
export function isListableStatus(status: LessonStatus): boolean {
  return status !== 'deleted';
}
