import { Course } from '../models/course.model';
import { Lesson } from '../../lessons/models/lesson.model';
import { NotFoundError } from '../../../common/custom-error';

export class CoursesService {
  static async listCourses(page = 1, limit = 10, search = '') {
    const skip = (page - 1) * limit;
    
    const query: any = { isPublished: true };
    if (search) {
      query.$text = { $search: search };
    }

    const [courses, total] = await Promise.all([
      Course.find(query)
        .skip(skip)
        .limit(limit)
        .sort(search ? { score: { $meta: 'textScore' } } : { createdAt: -1 }),
      Course.countDocuments(query),
    ]);

    return {
      courses,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  static async getCourseDetail(courseId: string) {
    const course = await Course.findById(courseId);
    if (!course) {
      throw new NotFoundError('Course not found.');
    }

    const lessons = await Lesson.find({ courseId }).sort({ order: 1 }).select('-content');

    return {
      course,
      lessons,
    };
  }

  static async createCourse(data: any) {
    return await Course.create({
      title: data.title,
      description: data.description,
      coverImage: data.coverImage,
      isPublished: data.isPublished || false,
    });
  }
}
export default CoursesService;
