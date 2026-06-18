import mongoose from 'mongoose';
import { Course, CourseLanguage, CourseLevel, CourseStatus } from '../models/course.model';
import { Lesson } from '../../lessons/models/lesson.model';
import { Section } from '../models/section.model';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../common/custom-error';

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

const generateUniqueSlug = async (base: string, excludeId?: string) => {
  const root = slugify(base) || 'course';
  let candidate = root;
  let suffix = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await Course.findOne({ slug: candidate });
    if (!existing || (excludeId && existing.id === excludeId)) return candidate;
    suffix += 1;
    candidate = `${root}-${suffix}`;
  }
};

export interface CourseListQuery {
  page?: number;
  limit?: number;
  q?: string;
  search?: string;
  level?: CourseLevel;
  language?: CourseLanguage;
  tag?: string;
  category?: string;
  isPremium?: boolean;
  minPrice?: number;
  maxPrice?: number;
  status?: CourseStatus;
  includeAll?: boolean;
}

export interface CourseCreatePayload {
  title: string;
  description: string;
  shortDescription?: string;
  thumbnailUrl?: string;
  language?: CourseLanguage;
  level?: CourseLevel;
  tags?: string[];
  category?: string;
  isPremium?: boolean;
  price?: number;
  prerequisites?: string[];
  prerequisiteThreshold?: number;
  estimatedDuration?: number;
  status?: CourseStatus;
  createdBy?: string;
}

const PUBLIC_STATUSES: CourseStatus[] = ['published'];

export class CoursesService {
  static async listCourses(query: CourseListQuery = {}) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};
    if (!query.includeAll) {
      filter.status = query.status ?? { $in: PUBLIC_STATUSES };
    } else if (query.status) {
      filter.status = query.status;
    }

    const keyword = query.q || query.search;
    if (keyword) filter.$text = { $search: keyword };
    if (query.level) filter.level = query.level;
    if (query.language) filter.language = query.language;
    if (query.tag) filter.tags = query.tag;
    if (query.category) filter.category = query.category;
    if (typeof query.isPremium === 'boolean') filter.isPremium = query.isPremium;
    if (typeof query.minPrice === 'number') filter.price = { ...(filter.price || {}), $gte: query.minPrice };
    if (typeof query.maxPrice === 'number') filter.price = { ...(filter.price || {}), $lte: query.maxPrice };

    const sort = keyword ? { score: { $meta: 'textScore' } } : { createdAt: -1 };

    const [courses, total] = await Promise.all([
      Course.find(filter).skip(skip).limit(limit).sort(sort as any),
      Course.countDocuments(filter),
    ]);

    return { courses, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  static async getCourseDetail(courseIdOrSlug: string, viewer?: { id?: string; role?: string }) {
    const course = mongoose.isValidObjectId(courseIdOrSlug)
      ? await Course.findById(courseIdOrSlug)
      : await Course.findOne({ slug: courseIdOrSlug });
    if (!course || course.status === 'deleted') throw new NotFoundError('Course not found.');
    const courseId = course.id;

    const isAdmin = viewer?.role === 'ADMIN';
    if (!isAdmin && !PUBLIC_STATUSES.includes(course.status)) {
      if (course.status === 'hidden' || course.status === 'archived') {
        // hidden allowed for already-enrolled users — enrollment check lives in iter 2
      } else {
        throw new NotFoundError('Course not found.');
      }
    }

    const sections = await Section.find({ courseId }).sort({ orderIndex: 1 });
    const lessons = await Lesson.find({ courseId, status: { $ne: 'deleted' } })
      .sort({ orderIndex: 1 })
      .select('-contentMarkdown -content');
    
    

    return { course, sections, lessons };
  }

  static async createCourse(data: CourseCreatePayload) {
    if (!data.title || !data.description) {
      throw new BadRequestError('title and description are required.');
    }
    const slug = await generateUniqueSlug(data.title);
    return Course.create({
      title: data.title.trim(),
      slug,
      description: data.description,
      shortDescription: data.shortDescription,
      thumbnailUrl: data.thumbnailUrl,
      language: data.language ?? 'javascript',
      level: data.level ?? 'BEGINNER',
      tags: data.tags ?? [],
      category: data.category,
      isPremium: !!data.isPremium,
      price: data.price ?? 0,
      prerequisites: (data.prerequisites ?? []).filter((id) => mongoose.isValidObjectId(id)),
      prerequisiteThreshold: data.prerequisiteThreshold ?? 80,
      estimatedDuration: data.estimatedDuration ?? 0,
      status: data.status ?? 'draft',
      createdBy: data.createdBy && mongoose.isValidObjectId(data.createdBy) ? data.createdBy : undefined,
      // legacy mirrors
      coverImage: data.thumbnailUrl,
      isPublished: (data.status ?? 'draft') === 'published',
    });
  }

  static async updateCourse(courseId: string, data: Partial<CourseCreatePayload>) {
    if (!mongoose.isValidObjectId(courseId)) throw new BadRequestError('Invalid course id.');
    const course = await Course.findById(courseId);
    if (!course || course.status === 'deleted') throw new NotFoundError('Course not found.');

    if (data.title && data.title.trim() !== course.title && course.status === 'draft') {
      course.title = data.title.trim();
      course.slug = await generateUniqueSlug(data.title, course.id);
    } else if (data.title) {
      course.title = data.title.trim();
    }

    const assignable: (keyof CourseCreatePayload)[] = [
      'description',
      'shortDescription',
      'thumbnailUrl',
      'language',
      'level',
      'tags',
      'category',
      'isPremium',
      'price',
      'prerequisiteThreshold',
      'estimatedDuration',
    ];
    for (const key of assignable) {
      if (data[key] !== undefined) (course as any)[key] = data[key];
    }

    if (data.prerequisites) {
      course.prerequisites = data.prerequisites
        .filter((id) => mongoose.isValidObjectId(id))
        .map((id) => new mongoose.Types.ObjectId(id));
    }
    if (data.thumbnailUrl !== undefined) course.coverImage = data.thumbnailUrl;
    await course.save();
    return course;
  }

  static async setVisibility(courseId: string, status: 'published' | 'hidden' | 'draft') {
    if (!mongoose.isValidObjectId(courseId)) throw new BadRequestError('Invalid course id.');
    const course = await Course.findById(courseId);
    if (!course || course.status === 'deleted') throw new NotFoundError('Course not found.');

    if (status === 'published') {
      const lessonCount = await Lesson.countDocuments({ courseId, status: 'active' });
      if (lessonCount === 0) {
        throw new BadRequestError('Course must contain at least one active lesson before publishing.');
      }
      if (!course.publishedAt) course.publishedAt = new Date();
    }
    course.status = status;
    course.isPublished = status === 'published';
    await course.save();
    return course;
  }

  static async softDeleteCourse(courseId: string) {
    if (!mongoose.isValidObjectId(courseId)) throw new BadRequestError('Invalid course id.');
    const course = await Course.findById(courseId);
    if (!course) throw new NotFoundError('Course not found.');
    if (course.status === 'deleted') return course;

    const hasEnrollments = course.totalEnrollments > 0;
    course.status = hasEnrollments ? 'archived' : 'deleted';
    course.isPublished = false;
    course.deletedAt = new Date();
    await course.save();
    return course;
  }

  static async restoreCourse(courseId: string) {
    if (!mongoose.isValidObjectId(courseId)) throw new BadRequestError('Invalid course id.');
    const course = await Course.findById(courseId);
    if (!course) throw new NotFoundError('Course not found.');
    if (course.deletedAt && Date.now() - course.deletedAt.getTime() > 30 * 24 * 60 * 60 * 1000) {
      throw new ForbiddenError('Restore window expired (30 days).');
    }
    course.status = 'draft';
    course.deletedAt = undefined;
    await course.save();
    return course;
  }

  static async refreshLessonCount(courseId: string) {
    const total = await Lesson.countDocuments({ courseId, status: 'active' });
    await Course.findByIdAndUpdate(courseId, { totalLessons: total });
    return total;
  }
}
export default CoursesService;
