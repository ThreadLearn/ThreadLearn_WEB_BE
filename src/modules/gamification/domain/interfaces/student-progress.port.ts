/**
 * PORT cho module gamification lấy tiến trình học viên mà không bị dính dáng
 * đến implementation details (như model Enrollment) của module khác.
 */
export interface IStudentProgressPort {
  getCompletedLessonsCount(userId: string): Promise<number>;
  getCompletedCoursesCount(userId: string): Promise<number>;
}

export const STUDENT_PROGRESS_PORT = Symbol('STUDENT_PROGRESS_PORT');
