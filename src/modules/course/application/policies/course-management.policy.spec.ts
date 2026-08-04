import { ForbiddenError } from '../../../../common/custom-error';
import { CourseManagementPolicy, isSameId, normalizeId } from './course-management.policy';

describe('CourseManagementPolicy', () => {
  let policy: CourseManagementPolicy;

  beforeEach(() => {
    policy = new CourseManagementPolicy();
  });

  const adminActor = { id: 'admin-1', role: 'ADMIN' };
  const instructor1Actor = { id: 'inst-1', role: 'INSTRUCTOR' };
  const instructor2Actor = { id: 'inst-2', role: 'INSTRUCTOR' };
  const studentActor = { id: 'student-1', role: 'STUDENT' };

  const validCourse = {
    id: 'course-1',
    instructorId: 'inst-1',
    status: 'draft',
    isDeleted: false,
  };

  const unassignedCourse = {
    id: 'course-2',
    instructorId: undefined,
    status: 'draft',
    isDeleted: false,
  };

  const deletedCourse = {
    id: 'course-3',
    instructorId: 'inst-1',
    status: 'deleted',
    isDeleted: true,
    deletedAt: new Date(),
  };

  describe('Assigned ownership & authoring', () => {
    it('1. Admin can author any valid course', () => {
      expect(policy.canAuthorCourse(adminActor, validCourse)).toBe(true);
      expect(() => policy.assertCanAuthorCourse(adminActor, validCourse)).not.toThrow();
    });

    it('2. Assigned Instructor can author their course at policy level', () => {
      expect(policy.canAuthorCourse(instructor1Actor, validCourse)).toBe(true);
      expect(() => policy.assertCanAuthorCourse(instructor1Actor, validCourse)).not.toThrow();
    });

    it('3. Other Instructor cannot author', () => {
      expect(policy.canAuthorCourse(instructor2Actor, validCourse)).toBe(false);
      expect(() => policy.assertCanAuthorCourse(instructor2Actor, validCourse)).toThrow(ForbiddenError);
    });

    it('4. Instructor who is createdBy but not assigned cannot author', () => {
      const createdByOnlyCourse = {
        id: 'course-4',
        instructorId: 'inst-2', // assigned to inst-2
        createdBy: 'inst-1', // created by inst-1
        status: 'draft',
        isDeleted: false,
      };
      expect(policy.canAuthorCourse(instructor1Actor, createdByOnlyCourse)).toBe(false);
    });

    it('5. Unassigned course cannot be authored by Instructor', () => {
      expect(policy.canAuthorCourse(instructor1Actor, unassignedCourse)).toBe(false);
    });

    it('6. Student cannot author course', () => {
      expect(policy.canAuthorCourse(studentActor, validCourse)).toBe(false);
      expect(() => policy.assertCanAuthorCourse(studentActor, validCourse)).toThrow(ForbiddenError);
    });

    it('7. Undefined / malformed instructorId denies access safely', () => {
      const malformedCourse = { id: 'course-5', instructorId: undefined, status: 'draft' };
      expect(policy.canAuthorCourse(instructor1Actor, malformedCourse)).toBe(false);
      expect(policy.canAuthorCourse(instructor1Actor, null)).toBe(false);
    });
  });

  describe('Soft-delete handling & edge cases', () => {
    it('Assigned Instructor cannot author Course where isDeleted = true', () => {
      const courseIsDeleted = { id: 'c-del-1', instructorId: 'inst-1', isDeleted: true };
      expect(policy.canAuthorCourse(instructor1Actor, courseIsDeleted)).toBe(false);
      expect(() => policy.assertCanAuthorCourse(instructor1Actor, courseIsDeleted)).toThrow(ForbiddenError);
    });

    it('Assigned Instructor cannot author Course where deletedAt is not null', () => {
      const courseDeletedAt = { id: 'c-del-2', instructorId: 'inst-1', deletedAt: new Date() };
      expect(policy.canAuthorCourse(instructor1Actor, courseDeletedAt)).toBe(false);
      expect(() => policy.assertCanAuthorCourse(instructor1Actor, courseDeletedAt)).toThrow(ForbiddenError);
    });

    it('Assigned Instructor cannot manage structure of soft-deleted Course', () => {
      const softDeleted = { id: 'c-del-3', instructorId: 'inst-1', status: 'deleted', isDeleted: true, deletedAt: new Date() };
      expect(policy.canManageCourseStructure(instructor1Actor, softDeleted)).toBe(false);
      expect(() => policy.assertCanManageCourseStructure(instructor1Actor, softDeleted)).toThrow(ForbiddenError);
    });

    it('Assigned Instructor cannot read soft-deleted Course in management workspace', () => {
      const softDeleted = { id: 'c-del-4', instructorId: 'inst-1', status: 'deleted', isDeleted: true };
      expect(policy.canReadCourseForManagement(instructor1Actor, softDeleted)).toBe(false);
      expect(() => policy.assertCanReadCourseForManagement(instructor1Actor, softDeleted)).toThrow(ForbiddenError);
    });

    it('Missing isDeleted / deletedAt fields do not cause technical errors', () => {
      const minimalCourse = { id: 'c-min', instructorId: 'inst-1' };
      expect(() => policy.canAuthorCourse(instructor1Actor, minimalCourse)).not.toThrow();
      expect(policy.canAuthorCourse(instructor1Actor, minimalCourse)).toBe(true);

      const noFields = { id: 'c-none' };
      expect(() => policy.canAuthorCourse(instructor1Actor, noFields)).not.toThrow();
    });

    it('Admin restore / delete behavior matches capability matrix', () => {
      // Active course: Admin can delete, cannot restore
      expect(policy.canDeleteCourse(adminActor, validCourse)).toBe(true);
      expect(policy.canRestoreCourse(adminActor, validCourse)).toBe(false);

      // Soft-deleted course: Admin can restore, cannot delete again
      expect(policy.canRestoreCourse(adminActor, deletedCourse)).toBe(true);
      expect(policy.canDeleteCourse(adminActor, deletedCourse)).toBe(false);
    });
  });

  describe('Manage course structure', () => {
    it('8. Admin can manage course structure', () => {
      expect(policy.canManageCourseStructure(adminActor, validCourse)).toBe(true);
      expect(() => policy.assertCanManageCourseStructure(adminActor, validCourse)).not.toThrow();
    });

    it('9. Assigned Instructor can manage course structure at policy level', () => {
      expect(policy.canManageCourseStructure(instructor1Actor, validCourse)).toBe(true);
      expect(() => policy.assertCanManageCourseStructure(instructor1Actor, validCourse)).not.toThrow();
    });

    it('10. Other Instructor is denied from structure management', () => {
      expect(policy.canManageCourseStructure(instructor2Actor, validCourse)).toBe(false);
      expect(() => policy.assertCanManageCourseStructure(instructor2Actor, validCourse)).toThrow(ForbiddenError);
    });

    it('11. Student is denied from structure management', () => {
      expect(policy.canManageCourseStructure(studentActor, validCourse)).toBe(false);
      expect(() => policy.assertCanManageCourseStructure(studentActor, validCourse)).toThrow(ForbiddenError);
    });
  });

  describe('Publishing', () => {
    it('12. Admin can publish', () => {
      expect(policy.canPublishCourse(adminActor, validCourse)).toBe(true);
      expect(() => policy.assertCanPublishCourse(adminActor, validCourse)).not.toThrow();
    });

    it('13. Assigned Instructor cannot publish in Phase 4', () => {
      expect(policy.canPublishCourse(instructor1Actor, validCourse)).toBe(false);
      expect(() => policy.assertCanPublishCourse(instructor1Actor, validCourse)).toThrow(ForbiddenError);
    });

    it('14. Other Instructor cannot publish', () => {
      expect(policy.canPublishCourse(instructor2Actor, validCourse)).toBe(false);
    });

    it('15. Student cannot publish', () => {
      expect(policy.canPublishCourse(studentActor, validCourse)).toBe(false);
    });
  });

  describe('Instructor assignment', () => {
    it('16. Admin can perform instructor assignment action', () => {
      expect(policy.canAssignInstructor(adminActor)).toBe(true);
      expect(() => policy.assertCanAssignInstructor(adminActor)).not.toThrow();
    });

    it('17. Instructor cannot assign instructor', () => {
      expect(policy.canAssignInstructor(instructor1Actor)).toBe(false);
      expect(() => policy.assertCanAssignInstructor(instructor1Actor)).toThrow(ForbiddenError);
    });

    it('18. Student cannot assign instructor', () => {
      expect(policy.canAssignInstructor(studentActor)).toBe(false);
    });
  });

  describe('Destructive actions (delete & restore)', () => {
    it('19. Admin can delete active course and restore deleted course', () => {
      expect(policy.canDeleteCourse(adminActor, validCourse)).toBe(true);
      expect(() => policy.assertCanDeleteCourse(adminActor, validCourse)).not.toThrow();

      expect(policy.canRestoreCourse(adminActor, deletedCourse)).toBe(true);
      expect(() => policy.assertCanRestoreCourse(adminActor, deletedCourse)).not.toThrow();
    });

    it('20. Instructor cannot delete or restore course', () => {
      expect(policy.canDeleteCourse(instructor1Actor, validCourse)).toBe(false);
      expect(() => policy.assertCanDeleteCourse(instructor1Actor, validCourse)).toThrow(ForbiddenError);

      expect(policy.canRestoreCourse(instructor1Actor, deletedCourse)).toBe(false);
      expect(() => policy.assertCanRestoreCourse(instructor1Actor, deletedCourse)).toThrow(ForbiddenError);
    });

    it('21. Student cannot delete or restore course', () => {
      expect(policy.canDeleteCourse(studentActor, validCourse)).toBe(false);
      expect(policy.canRestoreCourse(studentActor, deletedCourse)).toBe(false);
    });
  });

  describe('Management read', () => {
    it('22. Assigned Instructor can read course in management workspace', () => {
      expect(policy.canReadCourseForManagement(instructor1Actor, validCourse)).toBe(true);
      expect(() => policy.assertCanReadCourseForManagement(instructor1Actor, validCourse)).not.toThrow();
    });

    it('23. Other Instructor is denied from reading course in management workspace', () => {
      expect(policy.canReadCourseForManagement(instructor2Actor, validCourse)).toBe(false);
      expect(() => policy.assertCanReadCourseForManagement(instructor2Actor, validCourse)).toThrow(ForbiddenError);
    });

    it('24. Unassigned course is denied for Instructor management workspace read', () => {
      expect(policy.canReadCourseForManagement(instructor1Actor, unassignedCourse)).toBe(false);
    });

    it('25. Admin can read any course in management workspace', () => {
      expect(policy.canReadCourseForManagement(adminActor, validCourse)).toBe(true);
      expect(policy.canReadCourseForManagement(adminActor, unassignedCourse)).toBe(true);
    });

    it('26. Student is denied from management workspace read', () => {
      expect(policy.canReadCourseForManagement(studentActor, validCourse)).toBe(false);
    });
  });

  describe('Role validation & invalid roles', () => {
    it('Invalid or unknown roles are safely denied across all policy methods', () => {
      const invalidActors = [
        { id: 'user-1', role: 'GUEST' },
        { id: 'user-2', role: 'SUPERADMIN' },
        { id: 'user-3', role: '' },
        { id: 'user-4', role: 'student' }, // lowercase
        { id: 'user-5', role: 'instructor' }, // lowercase
      ];

      for (const actor of invalidActors) {
        expect(policy.canAuthorCourse(actor, validCourse)).toBe(false);
        expect(policy.canManageCourseStructure(actor, validCourse)).toBe(false);
        expect(policy.canPublishCourse(actor, validCourse)).toBe(false);
        expect(policy.canAssignInstructor(actor)).toBe(false);
        expect(policy.canDeleteCourse(actor, validCourse)).toBe(false);
        expect(policy.canRestoreCourse(actor, validCourse)).toBe(false);
        expect(policy.canReadCourseForManagement(actor, validCourse)).toBe(false);
      }
    });
  });

  describe('ID handling and normalization', () => {
    it('27. Equivalent string ID and ObjectId-like objects match', () => {
      const objectIdMock = { toString: () => 'inst-1' };
      expect(isSameId('inst-1', objectIdMock)).toBe(true);
      expect(policy.isAssignedInstructor(instructor1Actor, { id: 'c-1', instructorId: objectIdMock as any })).toBe(true);
    });

    it('28. Mismatched IDs are denied', () => {
      expect(isSameId('inst-1', 'inst-2')).toBe(false);
    });

    it('29. Null / undefined IDs are denied', () => {
      expect(isSameId(null, 'inst-1')).toBe(false);
      expect(isSameId(undefined, undefined)).toBe(false);
      expect(normalizeId(null)).toBeUndefined();
      expect(normalizeId(undefined)).toBeUndefined();
    });

    it('30. Safe against non-string objects without throwing technical errors', () => {
      expect(() => normalizeId({ arbitrary: true })).not.toThrow();
      expect(normalizeId({ arbitrary: true })).toBeUndefined();
      expect(() => isSameId(undefined, {})).not.toThrow();
    });
  });
});
