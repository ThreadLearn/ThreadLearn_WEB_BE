import { LessonEntity } from '../entities/lesson.entity';

/**
 * PORT: hợp đồng truy cập dữ liệu Lesson. Application chỉ biết interface này,
 * không biết Mongoose. Adapter (infrastructure) hiện thực.
 */
export interface ILessonRepository {
  findById(id: string): Promise<LessonEntity | null>;
  /** Danh sách bài của 1 course (loại bỏ deleted), sort theo orderIndex; KHÔNG kèm nội dung nặng. */
  listByCourse(courseId: string): Promise<LessonEntity[]>;
  /** Đếm bài chưa xoá của course — phục vụ tính orderIndex khi tạo mới. */
  countNonDeleted(courseId: string): Promise<number>;
  create(lesson: LessonEntity): Promise<LessonEntity>;
  update(lesson: LessonEntity): Promise<LessonEntity>;
}

export const LESSON_REPOSITORY = Symbol('LESSON_REPOSITORY');
