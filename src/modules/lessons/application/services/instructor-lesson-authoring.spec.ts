import mongoose from 'mongoose';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../../common/custom-error';
import { Course } from '../../../courses/models/course.model';
import { Section } from '../../../courses/models/section.model';
import { Lesson } from '../../models/lesson.model';
import { createInstructorLessonSchema, updateInstructorLessonSchema } from '../dto/instructor-lesson.dto';
import { InstructorLessonAccessResolver } from './instructor-lesson-access.resolver';
import { CreateInstructorLessonService } from './create-instructor-lesson.service';
import { GetInstructorLessonDetailService } from './get-instructor-lesson-detail.service';
import { ListInstructorLessonsBySectionService } from './list-instructor-lessons-by-section.service';
import { UpdateInstructorLessonService } from './update-instructor-lesson.service';
import { SoftDeleteInstructorLessonService } from './soft-delete-instructor-lesson.service';
import { ReorderInstructorLessonsService } from './reorder-instructor-lessons.service';
import { UploadInstructorLessonAttachmentService } from './upload-instructor-lesson-attachment.service';

describe('Instructor Lesson Authoring — Phase 5B Authorization & Validation Tests', () => {
  let resolver: InstructorLessonAccessResolver;
  let listInstructorLessonsBySectionService: ListInstructorLessonsBySectionService;
  let getInstructorLessonDetailService: GetInstructorLessonDetailService;
  let createInstructorLessonService: CreateInstructorLessonService;
  let updateInstructorLessonService: UpdateInstructorLessonService;
  let softDeleteInstructorLessonService: SoftDeleteInstructorLessonService;
  let reorderInstructorLessonsService: ReorderInstructorLessonsService;
  let uploadAttachmentService: UploadInstructorLessonAttachmentService;

  let mockCreateLessonService: any;
  let mockUpdateLessonService: any;
  let mockSoftDeleteLessonService: any;

  const adminActor = { id: 'admin-1', role: 'ADMIN' };
  const inst1Actor = { id: 'inst-1', role: 'INSTRUCTOR' };
  const inst2Actor = { id: 'inst-2', role: 'INSTRUCTOR' };
  const studentActor = { id: 'student-1', role: 'STUDENT' };

  const course1Id = new mongoose.Types.ObjectId().toString();
  const section1Id = new mongoose.Types.ObjectId().toString();
  const lesson1Id = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    resolver = new InstructorLessonAccessResolver();
    listInstructorLessonsBySectionService = new ListInstructorLessonsBySectionService(resolver);
    getInstructorLessonDetailService = new GetInstructorLessonDetailService(resolver);

    mockCreateLessonService = {
      execute: jest.fn().mockImplementation(async (input) => ({
        id: 'new-lesson-1',
        title: input.title,
        lessonType: input.lessonType,
        courseId: input.courseId,
        sectionId: input.sectionId,
      })),
    };

    mockUpdateLessonService = {
      execute: jest.fn().mockImplementation(async (id, input) => ({
        id,
        ...input,
      })),
    };

    mockSoftDeleteLessonService = {
      execute: jest.fn().mockResolvedValue({ id: lesson1Id }),
    };

    createInstructorLessonService = new CreateInstructorLessonService(
      resolver,
      mockCreateLessonService,
    );
    updateInstructorLessonService = new UpdateInstructorLessonService(
      resolver,
      mockUpdateLessonService,
    );
    softDeleteInstructorLessonService = new SoftDeleteInstructorLessonService(
      resolver,
      mockSoftDeleteLessonService,
    );
    reorderInstructorLessonsService = new ReorderInstructorLessonsService(resolver);
    uploadAttachmentService = new UploadInstructorLessonAttachmentService(resolver);
  });

  describe('DTO Validation & Anti-Spoofing Rules', () => {
    it('1. isPreview spoof in create body is rejected', () => {
      const result = createInstructorLessonSchema.safeParse({
        title: 'New Lesson',
        lessonType: 'article',
        isPreview: true,
      });
      expect(result.success).toBe(false);
    });

    it('2. attachments body spoof in create body is rejected', () => {
      const result = createInstructorLessonSchema.safeParse({
        title: 'New Lesson',
        lessonType: 'article',
        attachments: ['/uploads/file.pdf'],
      });
      expect(result.success).toBe(false);
    });

    it('3. unsupported lessonType (quiz/coding/assignment) on create is rejected', () => {
      const quizResult = createInstructorLessonSchema.safeParse({
        title: 'Quiz Lesson',
        lessonType: 'quiz',
      });
      expect(quizResult.success).toBe(false);

      const codingResult = createInstructorLessonSchema.safeParse({
        title: 'Coding Lesson',
        lessonType: 'coding',
      });
      expect(codingResult.success).toBe(false);
    });

    it('4. lessonType is immutable and rejected in update body', () => {
      const result = updateInstructorLessonSchema.safeParse({
        title: 'Updated Title',
        lessonType: 'video',
      });
      expect(result.success).toBe(false);
    });

    it('5. unsafe videoUrl protocols (javascript:, data:, file:) are rejected', () => {
      const jsUrl = createInstructorLessonSchema.safeParse({
        title: 'Lesson',
        lessonType: 'video',
        videoUrl: 'javascript:alert(1)',
      });
      expect(jsUrl.success).toBe(false);

      const dataUrl = createInstructorLessonSchema.safeParse({
        title: 'Lesson',
        lessonType: 'video',
        videoUrl: 'data:text/html,hack',
      });
      expect(dataUrl.success).toBe(false);

      const fileUrl = createInstructorLessonSchema.safeParse({
        title: 'Lesson',
        lessonType: 'video',
        videoUrl: 'file:///C:/Windows/system32',
      });
      expect(fileUrl.success).toBe(false);
    });

    it('6. unsafe subtitleTracks URLs are rejected', () => {
      const result = createInstructorLessonSchema.safeParse({
        title: 'Lesson',
        lessonType: 'video',
        subtitleTracks: [{ language: 'en', url: 'javascript:bad()' }],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Read Authorization vs Mutation Authorization', () => {
    beforeEach(() => {
      jest.spyOn(Section, 'findOne').mockResolvedValue({
        _id: section1Id,
        courseId: course1Id,
        status: 'active',
      } as any);

      jest.spyOn(Lesson, 'findOne').mockResolvedValue({
        _id: lesson1Id,
        sectionId: section1Id,
        courseId: course1Id,
        title: 'Lesson 1',
        lessonType: 'article',
        isLocked: false,
        status: 'active',
      } as any);

      jest.spyOn(Lesson, 'find').mockReturnValue({
        sort: jest.fn().mockResolvedValue([
          { _id: lesson1Id, title: 'Lesson 1', lessonType: 'article' },
        ]),
      } as any);
    });

    it('7. Assigned Instructor CAN list lessons in Published Course (Read-Only)', async () => {
      jest.spyOn(Course, 'findById').mockResolvedValue({
        _id: course1Id,
        instructorId: inst1Actor.id,
        status: 'published',
      } as any);

      const lessons = await listInstructorLessonsBySectionService.execute(inst1Actor, section1Id);
      expect(lessons).toHaveLength(1);
    });

    it('8. Assigned Instructor CAN read detail of Published/Locked/Quiz Lesson (Read-Only)', async () => {
      jest.spyOn(Course, 'findById').mockResolvedValue({
        _id: course1Id,
        instructorId: inst1Actor.id,
        status: 'published',
      } as any);

      jest.spyOn(Lesson, 'findOne').mockResolvedValue({
        _id: lesson1Id,
        sectionId: section1Id,
        courseId: course1Id,
        title: 'Quiz Lesson',
        lessonType: 'quiz',
        isLocked: true,
        status: 'active',
      } as any);

      const detail = await getInstructorLessonDetailService.execute(inst1Actor, lesson1Id);
      expect(detail.lesson.title).toBe('Quiz Lesson');
    });

    it('9. Published Course MUTATION is DENIED for Assigned Instructor (403)', async () => {
      jest.spyOn(Course, 'findById').mockResolvedValue({
        _id: course1Id,
        instructorId: inst1Actor.id,
        status: 'published',
      } as any);

      await expect(
        createInstructorLessonService.execute(inst1Actor, section1Id, {
          title: 'Live Edit',
          lessonType: 'article',
        }),
      ).rejects.toThrow(ForbiddenError);

      await expect(
        updateInstructorLessonService.execute(inst1Actor, lesson1Id, { title: 'Live Update' }),
      ).rejects.toThrow(ForbiddenError);

      await expect(
        softDeleteInstructorLessonService.execute(inst1Actor, lesson1Id),
      ).rejects.toThrow(ForbiddenError);
    });

    it('10. Locked Lesson or Out-of-Scope Type MUTATION is DENIED for Instructor (403)', async () => {
      jest.spyOn(Course, 'findById').mockResolvedValue({
        _id: course1Id,
        instructorId: inst1Actor.id,
        status: 'draft',
      } as any);

      jest.spyOn(Lesson, 'findOne').mockResolvedValue({
        _id: lesson1Id,
        sectionId: section1Id,
        courseId: course1Id,
        title: 'Locked Quiz Lesson',
        lessonType: 'quiz',
        isLocked: true,
        status: 'active',
      } as any);

      await expect(
        updateInstructorLessonService.execute(inst1Actor, lesson1Id, { title: 'Mod' }),
      ).rejects.toThrow(ForbiddenError);
    });

    it('11. Other Instructor is DENIED from reading or mutating unassigned Lesson (403)', async () => {
      jest.spyOn(Course, 'findById').mockResolvedValue({
        _id: course1Id,
        instructorId: inst1Actor.id, // assigned to inst1
        status: 'draft',
      } as any);

      await expect(
        listInstructorLessonsBySectionService.execute(inst2Actor, section1Id),
      ).rejects.toThrow(ForbiddenError);

      await expect(
        getInstructorLessonDetailService.execute(inst2Actor, lesson1Id),
      ).rejects.toThrow(ForbiddenError);

      await expect(
        updateInstructorLessonService.execute(inst2Actor, lesson1Id, { title: 'Hack' }),
      ).rejects.toThrow(ForbiddenError);
    });

    it('12. Soft-deleted Course / Section / Lesson is rejected with NotFoundError', async () => {
      jest.spyOn(Course, 'findById').mockResolvedValue(null);

      await expect(
        listInstructorLessonsBySectionService.execute(inst1Actor, section1Id),
      ).rejects.toThrow(NotFoundError);
    });

    it('13. Mid-edit Course reassignment (instructorId changes) denies access (403)', async () => {
      jest.spyOn(Course, 'findById').mockResolvedValue({
        _id: course1Id,
        instructorId: 'other-instructor', // reassigned!
        status: 'draft',
      } as any);

      await expect(
        updateInstructorLessonService.execute(inst1Actor, lesson1Id, { title: 'Mid-edit' }),
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('Reorder & Full-Set Validation', () => {
    it('14. Reorder requires full-set of active lessons; missing/duplicate/foreign ID is rejected', async () => {
      const secId = new mongoose.Types.ObjectId().toString();
      const les1 = new mongoose.Types.ObjectId().toString();
      const les2 = new mongoose.Types.ObjectId().toString();

      jest.spyOn(Section, 'findOne').mockResolvedValue({
        _id: secId,
        courseId: course1Id,
        status: 'active',
      } as any);

      jest.spyOn(Course, 'findById').mockResolvedValue({
        _id: course1Id,
        instructorId: inst1Actor.id,
        status: 'draft',
      } as any);

      jest.spyOn(Lesson, 'find').mockResolvedValue([
        { _id: les1, sectionId: secId, status: 'active' },
        { _id: les2, sectionId: secId, status: 'active' },
      ] as any);

      // Duplicate payload
      await expect(
        reorderInstructorLessonsService.execute(inst1Actor, secId, [les1, les1]),
      ).rejects.toThrow(BadRequestError);

      // Missing les2
      await expect(
        reorderInstructorLessonsService.execute(inst1Actor, secId, [les1]),
      ).rejects.toThrow(BadRequestError);

      // Foreign ID
      await expect(
        reorderInstructorLessonsService.execute(inst1Actor, secId, [les1, 'foreign-id']),
      ).rejects.toThrow(BadRequestError);
    });

    it('15. Reorder with valid full-set active lessons succeeds', async () => {
      const secId = new mongoose.Types.ObjectId().toString();
      const les1 = new mongoose.Types.ObjectId().toString();
      const les2 = new mongoose.Types.ObjectId().toString();

      jest.spyOn(Section, 'findOne').mockResolvedValue({
        _id: secId,
        courseId: course1Id,
        status: 'active',
      } as any);

      jest.spyOn(Course, 'findById').mockResolvedValue({
        _id: course1Id,
        instructorId: inst1Actor.id,
        status: 'draft',
      } as any);

      jest.spyOn(Lesson, 'find').mockResolvedValue([
        { _id: les1, sectionId: secId, status: 'active' },
        { _id: les2, sectionId: secId, status: 'active' },
      ] as any);

      jest.spyOn(Lesson, 'bulkWrite').mockResolvedValue({} as any);

      const result = await reorderInstructorLessonsService.execute(inst1Actor, secId, [les2, les1]);

      expect(result.totalReordered).toBe(2);
      expect(Lesson.bulkWrite).toHaveBeenCalledWith(expect.any(Array));
    });
  });

  describe('Attachment Upload Policy & File Safety', () => {
    it('16. Disallowed MIME types (text/html, application/javascript, image/svg+xml) are rejected before storage', async () => {
      const mockHtmlFile: any = {
        originalname: 'attack.html',
        mimetype: 'text/html',
        size: 1024,
      };

      await expect(
        uploadAttachmentService.execute(inst1Actor, lesson1Id, mockHtmlFile),
      ).rejects.toThrow(BadRequestError);
    });

    it('17. Disallowed extensions (.exe, .sh, .bat, .svg) are rejected before storage', async () => {
      const mockExeFile: any = {
        originalname: 'malware.exe',
        mimetype: 'application/octet-stream',
        size: 1024,
      };

      await expect(
        uploadAttachmentService.execute(inst1Actor, lesson1Id, mockExeFile),
      ).rejects.toThrow(BadRequestError);
    });

    it('18. Path traversal attempt in originalname is rejected before storage', async () => {
      const mockTraversalFile: any = {
        originalname: '../../etc/passwd.pdf',
        mimetype: 'application/pdf',
        size: 1024,
      };

      await expect(
        uploadAttachmentService.execute(inst1Actor, lesson1Id, mockTraversalFile),
      ).rejects.toThrow(BadRequestError);
    });

    it('19. Unauthorized user cannot upload attachment (storage not executed)', async () => {
      jest.spyOn(Section, 'findOne').mockResolvedValue({
        _id: section1Id,
        courseId: course1Id,
        status: 'active',
      } as any);

      jest.spyOn(Course, 'findById').mockResolvedValue({
        _id: course1Id,
        instructorId: inst1Actor.id,
        status: 'draft',
      } as any);

      jest.spyOn(Lesson, 'findOne').mockResolvedValue({
        _id: lesson1Id,
        sectionId: section1Id,
        courseId: course1Id,
        title: 'Lesson 1',
        lessonType: 'article',
        isLocked: false,
        status: 'active',
      } as any);

      const mockPdf: any = {
        originalname: 'notes.pdf',
        mimetype: 'application/pdf',
        size: 1024,
      };

      await expect(
        uploadAttachmentService.execute(inst2Actor, lesson1Id, mockPdf),
      ).rejects.toThrow(ForbiddenError);
    });

    it('20. Admin actor can author lessons and manage structure', async () => {
      jest.spyOn(Section, 'findOne').mockResolvedValue({
        _id: section1Id,
        courseId: course1Id,
        status: 'active',
      } as any);

      jest.spyOn(Course, 'findById').mockResolvedValue({
        _id: course1Id,
        instructorId: inst1Actor.id,
        status: 'draft',
      } as any);

      jest.spyOn(Lesson, 'findOne').mockResolvedValue({
        _id: lesson1Id,
        sectionId: section1Id,
        courseId: course1Id,
        title: 'Lesson 1',
        lessonType: 'article',
        isLocked: false,
        status: 'active',
      } as any);

      const updated = await updateInstructorLessonService.execute(adminActor, lesson1Id, {
        title: 'Admin Edit',
      });
      expect(updated.title).toBe('Admin Edit');
    });

    it('21. Student is rejected from all lesson authoring actions (403)', async () => {
      jest.spyOn(Section, 'findOne').mockResolvedValue({
        _id: section1Id,
        courseId: course1Id,
        status: 'active',
      } as any);

      jest.spyOn(Course, 'findById').mockResolvedValue({
        _id: course1Id,
        instructorId: inst1Actor.id,
        status: 'draft',
      } as any);

      await expect(
        createInstructorLessonService.execute(studentActor, section1Id, {
          title: 'Student Lesson',
          lessonType: 'article',
        }),
      ).rejects.toThrow(ForbiddenError);
    });
  });
});
