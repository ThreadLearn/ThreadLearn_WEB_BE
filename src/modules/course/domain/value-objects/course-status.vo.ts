export type CourseStatus = 'draft' | 'published' | 'hidden' | 'archived' | 'deleted';
export type CourseLanguage = 'javascript' | 'java' | 'python';
export type CourseLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

/** Các trạng thái mà khách (guest) / học viên chưa enroll được phép thấy. */
export const PUBLIC_COURSE_STATUSES: readonly CourseStatus[] = ['published'];

/** Cửa sổ khôi phục khoá học đã xoá mềm: 30 ngày. */
export const RESTORE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export function isPubliclyVisible(status: CourseStatus): boolean {
  return PUBLIC_COURSE_STATUSES.includes(status);
}
