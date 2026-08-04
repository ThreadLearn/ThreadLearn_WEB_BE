import mongoose from 'mongoose';
import { BadRequestError, ForbiddenError } from '../../../common/custom-error';
import { CourseManagementPolicy } from '../../course/application/policies/course-management.policy';
import { Course } from '../models/course.model';
import { Section } from '../models/section.model';
import { Lesson } from '../../lessons/models/lesson.model';
import { SectionsService } from './sections.service';

describe('SectionsService — Phase 5A Authorization & Validation Tests', () => {
  let policy: CourseManagementPolicy;
  let service: SectionsService;

  const inst1Actor = { id: new mongoose.Types.ObjectId().toString(), role: 'INSTRUCTOR' };
  const inst2Actor = { id: new mongoose.Types.ObjectId().toString(), role: 'INSTRUCTOR' };

  let course1Id: string;
  let course2Id: string;

  beforeEach(async () => {
    policy = new CourseManagementPolicy();
    service = new SectionsService(policy);

    course1Id = new mongoose.Types.ObjectId().toString();
    course2Id = new mongoose.Types.ObjectId().toString();
  });

  describe('Section List Authorization', () => {
    it('Assigned Instructor can list sections of their course', async () => {
      jest.spyOn(Course, 'findById').mockResolvedValue({
        _id: course1Id,
        instructorId: inst1Actor.id,
        status: 'draft',
      } as any);
      jest.spyOn(Section, 'find').mockReturnValue({
        sort: jest.fn().mockResolvedValue([{ title: 'Sec 1' }]),
      } as any);

      const result = await service.listByCourse(inst1Actor, course1Id);
      expect(result).toHaveLength(1);
    });

    it('Other Instructor cannot list sections of another instructor course (403)', async () => {
      jest.spyOn(Course, 'findById').mockResolvedValue({
        _id: course1Id,
        instructorId: inst1Actor.id,
        status: 'draft',
      } as any);

      await expect(service.listByCourse(inst2Actor, course1Id)).rejects.toThrow(ForbiddenError);
    });
  });

  describe('Section Update & courseId Immunity', () => {
    it('Section update cannot change courseId', async () => {
      const sectionId = new mongoose.Types.ObjectId().toString();
      jest.spyOn(Section, 'findOne').mockResolvedValue({
        _id: sectionId,
        courseId: course1Id,
        status: 'active',
        title: 'Original Title',
        save: jest.fn(),
      } as any);

      await expect(
        service.update(inst1Actor, sectionId, { courseId: course2Id, title: 'New Title' }),
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('Section Reorder Security & Validation', () => {
    it('Reorder with duplicate section IDs is rejected', async () => {
      jest.spyOn(Course, 'findById').mockResolvedValue({
        _id: course1Id,
        instructorId: inst1Actor.id,
        status: 'draft',
      } as any);

      const dupId = new mongoose.Types.ObjectId().toString();

      await expect(
        service.reorder(inst1Actor, course1Id, [
          { id: dupId, orderIndex: 0 },
          { id: dupId, orderIndex: 1 },
        ]),
      ).rejects.toThrow(BadRequestError);
    });

    it('Reorder containing section belonging to another course is rejected', async () => {
      jest.spyOn(Course, 'findById').mockResolvedValue({
        _id: course1Id,
        instructorId: inst1Actor.id,
        status: 'draft',
      } as any);

      const sec1Id = new mongoose.Types.ObjectId().toString();
      const secForeignId = new mongoose.Types.ObjectId().toString();

      jest.spyOn(Section, 'find').mockResolvedValue([
        { _id: sec1Id, courseId: course1Id, status: 'active' },
        { _id: secForeignId, courseId: course2Id, status: 'active' }, // foreign course!
      ] as any);

      await expect(
        service.reorder(inst1Actor, course1Id, [
          { id: sec1Id, orderIndex: 0 },
          { id: secForeignId, orderIndex: 1 },
        ]),
      ).rejects.toThrow(BadRequestError);
    });

    it('Reorder containing soft-deleted section is rejected', async () => {
      jest.spyOn(Course, 'findById').mockResolvedValue({
        _id: course1Id,
        instructorId: inst1Actor.id,
        status: 'draft',
      } as any);

      const sec1Id = new mongoose.Types.ObjectId().toString();
      const secDeletedId = new mongoose.Types.ObjectId().toString();

      jest.spyOn(Section, 'find').mockResolvedValue([
        { _id: sec1Id, courseId: course1Id, status: 'active' },
        { _id: secDeletedId, courseId: course1Id, status: 'deleted' }, // deleted!
      ] as any);

      await expect(
        service.reorder(inst1Actor, course1Id, [
          { id: sec1Id, orderIndex: 0 },
          { id: secDeletedId, orderIndex: 1 },
        ]),
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('Published Course Section Mutations', () => {
    it('5. Assigned Instructor cannot create Section in Published Course', async () => {
      jest.spyOn(Course, 'findById').mockResolvedValue({
        _id: course1Id,
        instructorId: inst1Actor.id,
        status: 'published',
      } as any);

      await expect(
        service.create(inst1Actor, { courseId: course1Id, title: 'New Section' }),
      ).rejects.toThrow(ForbiddenError);
    });

    it('6. Assigned Instructor cannot update Section in Published Course', async () => {
      const sectionId = new mongoose.Types.ObjectId().toString();
      jest.spyOn(Section, 'findOne').mockResolvedValue({
        _id: sectionId,
        courseId: course1Id,
        status: 'active',
        title: 'Original Title',
      } as any);

      jest.spyOn(Course, 'findById').mockResolvedValue({
        _id: course1Id,
        instructorId: inst1Actor.id,
        status: 'published',
      } as any);

      await expect(
        service.update(inst1Actor, sectionId, { title: 'Updated Section' }),
      ).rejects.toThrow(ForbiddenError);
    });

    it('7. Assigned Instructor cannot delete Section in Published Course', async () => {
      const sectionId = new mongoose.Types.ObjectId().toString();
      jest.spyOn(Section, 'findOne').mockResolvedValue({
        _id: sectionId,
        courseId: course1Id,
        status: 'active',
      } as any);

      jest.spyOn(Course, 'findById').mockResolvedValue({
        _id: course1Id,
        instructorId: inst1Actor.id,
        status: 'published',
      } as any);

      await expect(service.remove(inst1Actor, sectionId)).rejects.toThrow(ForbiddenError);
    });

    it('8. Assigned Instructor cannot reorder Section in Published Course', async () => {
      jest.spyOn(Course, 'findById').mockResolvedValue({
        _id: course1Id,
        instructorId: inst1Actor.id,
        status: 'published',
      } as any);

      const secId = new mongoose.Types.ObjectId().toString();

      await expect(
        service.reorder(inst1Actor, course1Id, [{ id: secId, orderIndex: 0 }]),
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('Section Soft-Delete & Lesson Relationship Integrity', () => {
    it('Soft-delete Section does not unset sectionId on Lessons or delete Lesson documents', async () => {
      const sectionId = new mongoose.Types.ObjectId().toString();
      const mockSectionInstance = {
        _id: sectionId,
        courseId: course1Id,
        status: 'active',
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Section, 'findOne').mockResolvedValue(mockSectionInstance as any);
      jest.spyOn(Course, 'findById').mockResolvedValue({
        _id: course1Id,
        instructorId: inst1Actor.id,
        status: 'draft',
      } as any);

      const spyLessonUpdate = jest.spyOn(Lesson, 'updateMany');

      await service.remove(inst1Actor, sectionId);

      // Verify Lesson.updateMany with $unset was NOT called!
      expect(spyLessonUpdate).not.toHaveBeenCalled();
      expect(mockSectionInstance.status).toBe('deleted');
      expect(mockSectionInstance.save).toHaveBeenCalled();
    });

    it('Admin can restore soft-deleted Section', async () => {
      const sectionId = new mongoose.Types.ObjectId().toString();
      const mockSectionInstance = {
        _id: sectionId,
        courseId: course1Id,
        status: 'deleted',
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Section, 'findOne').mockResolvedValue(mockSectionInstance as any);
      jest.spyOn(Course, 'findById').mockResolvedValue({
        _id: course1Id,
        instructorId: inst1Actor.id,
        status: 'draft',
      } as any);

      const adminActor = { id: 'admin-1', role: 'ADMIN' };
      const restored = await service.restore(adminActor, sectionId);

      expect(restored.status).toBe('active');
      expect(mockSectionInstance.save).toHaveBeenCalled();
    });

    it('Instructor cannot restore soft-deleted Section (403)', async () => {
      const sectionId = new mongoose.Types.ObjectId().toString();

      await expect(service.restore(inst1Actor, sectionId)).rejects.toThrow(ForbiddenError);
    });
  });
});
