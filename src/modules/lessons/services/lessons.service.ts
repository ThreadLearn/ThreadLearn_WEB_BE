import mongoose from 'mongoose';
import { Lesson, LessonType } from '../models/lesson.model';
import { LessonVersion } from '../models/lesson-version.model';
import { Course } from '../../courses/models/course.model';
import { Enrollment } from '../../enrollments/models/enrollment.model';
import { CoursesService } from '../../courses/services/courses.service';
import { User } from '../../auth/models/user.model';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../common/custom-error';

export interface LessonCreatePayload {
  courseId: string;
  sectionId?: string;
  title: string;
  description?: string;
  contentMarkdown?: string;
  lessonType?: LessonType;
  videoUrl?: string;
  attachments?: string[];
  codeSnippets?: { language: string; code: string; description?: string }[];
  orderIndex?: number;
  estimatedTime?: number;
  isPreview?: boolean;
  isLocked?: boolean;
  createdBy?: string;
}

const VERSION_THRESHOLD_CHARS = 1000;

export class LessonsService {
  static async getLesson(lessonId: string) {
    if (!mongoose.isValidObjectId(lessonId)) throw new BadRequestError('Invalid lesson id.');
    const lesson = await Lesson.findById(lessonId);
    if (!lesson || lesson.status === 'deleted') throw new NotFoundError('Lesson not found.');
    return lesson;
  }

  static async getLessonForViewer(lessonId: string, viewer?: { id?: string; role?: string }) {
    const lesson = await LessonsService.getLesson(lessonId);
    const access = await LessonsService.checkAccess(lessonId, viewer);
    if (!access.canView) {
      if (access.reason === 'LESSON_NOT_FOUND') throw new NotFoundError('Lesson not found.');
      if (access.reason === 'LESSON_LOCKED') throw new ForbiddenError('Lesson is locked.');
      throw new ForbiddenError('You must enroll before viewing this lesson.');
    }

    // UC59 — Resume Learning: a student opening a lesson should bump the
    // enrollment cursor so "Continue learning" lands them back here. Best-effort
    // only; never block the read path.
    if (viewer?.id && access.reason === 'ENROLLED') {
      Enrollment.updateOne(
        { userId: viewer.id, courseId: lesson.courseId },
        { $set: { lastLessonId: lesson._id, lastAccessedAt: new Date() } }
      ).catch(() => undefined);
    }

    return lesson;
  }

  static async assertLessonAccess(
    lessonId: string,
    viewer: { id?: string; role?: string },
    options: { allowPreview?: boolean } = {}
  ) {
    const access = await LessonsService.checkAccess(lessonId, viewer);
    if (!access.canView || (!options.allowPreview && access.reason === 'PREVIEW')) {
      if (access.reason === 'LESSON_NOT_FOUND') throw new NotFoundError('Lesson not found.');
      if (access.reason === 'LESSON_LOCKED') throw new ForbiddenError('Lesson is locked.');
      throw new ForbiddenError('You must enroll before using this lesson feature.');
    }
    return LessonsService.getLesson(lessonId);
  }

  static async listByCourse(courseId: string) {
    if (!mongoose.isValidObjectId(courseId)) throw new BadRequestError('Invalid course id.');
    return Lesson.find({ courseId, status: { $ne: 'deleted' } })
      .sort({ orderIndex: 1 })
      .select('-contentMarkdown -content');
  }

  static async createLesson(data: LessonCreatePayload) {
    if (!mongoose.isValidObjectId(data.courseId)) throw new BadRequestError('Invalid course id.');
    const course = await Course.findById(data.courseId);
    if (!course || course.status === 'deleted') throw new NotFoundError('Course not found.');

    const order =
      typeof data.orderIndex === 'number'
        ? data.orderIndex
        : (await Lesson.countDocuments({ courseId: data.courseId, status: { $ne: 'deleted' } }));

    const lesson = await Lesson.create({
      courseId: data.courseId,
      sectionId:
        data.sectionId && mongoose.isValidObjectId(data.sectionId) ? data.sectionId : undefined,
      title: data.title,
      description: data.description,
      contentMarkdown: data.contentMarkdown ?? '',
      lessonType: data.lessonType ?? 'article',
      videoUrl: data.videoUrl,
      attachments: data.attachments ?? [],
      codeSnippets: data.codeSnippets ?? [],
      orderIndex: order,
      estimatedTime: data.estimatedTime ?? 0,
      isPreview: !!data.isPreview,
      isLocked: !!data.isLocked,
      status: data.isLocked ? 'locked' : 'active',
      // legacy mirror
      content: data.contentMarkdown ?? '',
      order,
    });

    if ((data.contentMarkdown?.length ?? 0) > 0) {
      const version = await LessonVersion.create({
        lessonId: lesson._id,
        version: 1,
        contentMarkdown: data.contentMarkdown ?? '',
        createdBy:
          data.createdBy && mongoose.isValidObjectId(data.createdBy) ? data.createdBy : undefined,
      });
      lesson.currentVersionId = version._id as mongoose.Types.ObjectId;
      await lesson.save();
    }

    await CoursesService.refreshLessonCount(data.courseId);

    // Lessons of type "coding" or "mixed" almost always need a hands-on
    // exercise. Generate a starter template so the admin doesn't have to leave
    // the course flow to bootstrap a Submit experience.
    if (lesson.lessonType === 'coding' || lesson.lessonType === 'mixed') {
      try {
        const courseLanguage = (course.language ?? 'javascript').toLowerCase();
        const starter =
          courseLanguage === 'python'
            ? '# Write your solution below.\n# Read input via "input" (multi-line string).\nprint("Hello, ThreadLearn!")\n'
            : courseLanguage === 'java'
            ? 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello, ThreadLearn!");\n  }\n}\n'
            : '// Write your solution below.\n// Use the provided "input" string.\nconsole.log("Hello, ThreadLearn!");\n';
        const { Exercise } = await import('../../code-execution/models/exercise.model');
        await Exercise.create({
          lessonId: lesson._id,
          title: `${lesson.title} — Starter exercise`,
          description: 'Template tự tạo. Admin chỉnh sửa lại nội dung + test cases trong /admin/exercises.',
          starterCode: starter,
          language: courseLanguage,
          testCases: [
            { input: '', expectedOutput: 'Hello, ThreadLearn!', isHidden: false, points: 1 },
          ],
          totalPoints: 1,
          timeLimitMs: 5000,
        });
      } catch (err) {
        // Don't fail the lesson create if the template auto-seed errors out.
        // Admin can always craft the exercise manually.
      }
    }

    return lesson;
  }

  static async updateLesson(
    lessonId: string,
    data: Partial<LessonCreatePayload>,
    actor?: { id?: string }
  ) {
    const lesson = await LessonsService.getLesson(lessonId);

    const oldContent = lesson.contentMarkdown ?? '';
    let bumpVersion = false;

    const direct: (keyof LessonCreatePayload)[] = [
      'title',
      'description',
      'lessonType',
      'videoUrl',
      'attachments',
      'codeSnippets',
      'estimatedTime',
    ];
    for (const key of direct) {
      if (data[key] !== undefined) (lesson as any)[key] = data[key];
    }
    if (data.sectionId !== undefined) {
      lesson.sectionId =
        data.sectionId && mongoose.isValidObjectId(data.sectionId)
          ? new mongoose.Types.ObjectId(data.sectionId)
          : undefined;
    }
    if (typeof data.orderIndex === 'number') lesson.orderIndex = data.orderIndex;
    if (typeof data.isPreview === 'boolean') lesson.isPreview = data.isPreview;

    if (typeof data.contentMarkdown === 'string') {
      lesson.contentMarkdown = data.contentMarkdown;
      lesson.content = data.contentMarkdown;
      if (Math.abs(data.contentMarkdown.length - oldContent.length) >= VERSION_THRESHOLD_CHARS) {
        bumpVersion = true;
      }
    }
    await lesson.save();

    if (bumpVersion) {
      const lastVersion = await LessonVersion.findOne({ lessonId: lesson._id })
        .sort({ version: -1 })
        .select('version');
      const next = await LessonVersion.create({
        lessonId: lesson._id,
        version: (lastVersion?.version ?? 0) + 1,
        contentMarkdown: lesson.contentMarkdown,
        createdBy: actor?.id && mongoose.isValidObjectId(actor.id) ? actor.id : undefined,
      });
      lesson.currentVersionId = next._id as mongoose.Types.ObjectId;
      await lesson.save();
    }

    return lesson;
  }

  static async setLock(lessonId: string, locked: boolean) {
    const lesson = await LessonsService.getLesson(lessonId);
    lesson.isLocked = locked;
    lesson.status = locked ? 'locked' : 'active';
    await lesson.save();
    return lesson;
  }

  static async softDelete(lessonId: string) {
    const lesson = await LessonsService.getLesson(lessonId);
    lesson.status = 'deleted';
    lesson.deletedAt = new Date();
    await lesson.save();
    await CoursesService.refreshLessonCount(lesson.courseId.toString());
    return { id: lesson.id };
  }

  static async listVersions(lessonId: string) {
    if (!mongoose.isValidObjectId(lessonId)) throw new BadRequestError('Invalid lesson id.');
    return LessonVersion.find({ lessonId }).sort({ version: -1 });
  }

  static async updateAttachment(lessonId: string, attachmentUrl: string) {
    const lesson = await LessonsService.getLesson(lessonId);
    lesson.attachments = [...(lesson.attachments ?? []), attachmentUrl];
    lesson.attachmentUrl = attachmentUrl;
    await lesson.save();
    return lesson;
  }

  static async checkAccess(lessonId: string, viewer?: { id?: string; role?: string }) {
    if (!mongoose.isValidObjectId(lessonId)) throw new BadRequestError('Invalid lesson id.');
    const lesson = await Lesson.findById(lessonId);
    if (!lesson || lesson.status === 'deleted') {
      return { canView: false, reason: 'LESSON_NOT_FOUND' as const };
    }
    if (viewer?.role === 'ADMIN') return { canView: true, reason: 'ADMIN' as const };

    if (lesson.status === 'locked' || lesson.isLocked) {
      if (lesson.isPreview) return { canView: true, reason: 'PREVIEW' as const };
      return { canView: false, reason: 'LESSON_LOCKED' as const };
    }
    if (lesson.isPreview) return { canView: true, reason: 'PREVIEW' as const };

    if (!viewer?.id) {
      return { canView: false, reason: 'NOT_ENROLLED' as const };
    }

    const course = await Course.findById(lesson.courseId).select('status isPremium');
    if (!course || course.status === 'deleted') {
      return { canView: false, reason: 'LESSON_NOT_FOUND' as const };
    }
    if (course.status !== 'published') {
      return { canView: false, reason: 'NOT_ENROLLED' as const };
    }
    if (course.isPremium) {
      const user = await User.findById(viewer.id).select('planType subscriptionExpiresAt');
      const isPremium =
        user?.planType === 'PREMIUM' &&
        (!user.subscriptionExpiresAt || user.subscriptionExpiresAt.getTime() > Date.now());
      if (!isPremium) return { canView: false, reason: 'PREMIUM_REQUIRED' as const };
    }

    const enrolled = await Enrollment.findOne({
      userId: viewer.id,
      courseId: lesson.courseId,
    }).select('_id');
    if (!enrolled) {
      return { canView: false, reason: 'NOT_ENROLLED' as const };
    }
    return { canView: true, reason: 'ENROLLED' as const };
  }
}
export default LessonsService;
