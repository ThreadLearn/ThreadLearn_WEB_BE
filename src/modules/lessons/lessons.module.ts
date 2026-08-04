import { Module } from '@nestjs/common';
import { CourseModule } from '../course/course.module';
import { LearningAccessModule } from '../../shared/application/learning-access/learning-access.module';
import { CheckLessonAccessService } from './application/services/check-lesson-access.service';
import { CreateLessonService } from './application/services/create-lesson.service';
import { GetLessonForViewerService } from './application/services/get-lesson-for-viewer.service';
import { ListLessonsByCourseService } from './application/services/list-lessons-by-course.service';
import { ListLessonVersionsService } from './application/services/list-lesson-versions.service';
import { SetLessonLockService } from './application/services/set-lesson-lock.service';
import { SoftDeleteLessonService } from './application/services/soft-delete-lesson.service';
import { UpdateLessonAttachmentService } from './application/services/update-lesson-attachment.service';
import { UpdateLessonService } from './application/services/update-lesson.service';
import { EXERCISE_SEEDER_PORT } from './domain/interfaces/exercise-seeder.port';
import { LESSON_READ_PORT } from './domain/interfaces/lesson-read.port';
import { LESSON_REPOSITORY } from './domain/interfaces/lesson.repository';
import { LESSON_VERSION_REPOSITORY } from './domain/interfaces/lesson-version.repository';
import { MongoExerciseSeederAdapter } from './infrastructure/persistence/mongo-exercise-seeder.adapter';
import { MongoLessonReadAdapter } from './infrastructure/persistence/mongo-lesson-read.adapter';
import { MongoLessonRepository } from './infrastructure/persistence/mongo-lesson.repository';
import { MongoLessonVersionRepository } from './infrastructure/persistence/mongo-lesson-version.repository';
import { LessonController } from './presentation/controller/lesson.controller';
import { InstructorLessonAccessResolver } from './application/services/instructor-lesson-access.resolver';
import { ListInstructorLessonsBySectionService } from './application/services/list-instructor-lessons-by-section.service';
import { GetInstructorLessonDetailService } from './application/services/get-instructor-lesson-detail.service';
import { CreateInstructorLessonService } from './application/services/create-instructor-lesson.service';
import { UpdateInstructorLessonService } from './application/services/update-instructor-lesson.service';
import { SoftDeleteInstructorLessonService } from './application/services/soft-delete-instructor-lesson.service';
import { ReorderInstructorLessonsService } from './application/services/reorder-instructor-lessons.service';
import { UploadInstructorLessonAttachmentService } from './application/services/upload-instructor-lesson-attachment.service';
import { InstructorLessonController } from './presentation/controller/instructor-lesson.controller';

@Module({
  imports: [LearningAccessModule, CourseModule],
  controllers: [LessonController, InstructorLessonController],
  providers: [
    MongoLessonRepository,
    MongoLessonVersionRepository,
    MongoLessonReadAdapter,
    MongoExerciseSeederAdapter,
    { provide: LESSON_REPOSITORY, useExisting: MongoLessonRepository },
    { provide: LESSON_VERSION_REPOSITORY, useExisting: MongoLessonVersionRepository },
    { provide: LESSON_READ_PORT, useExisting: MongoLessonReadAdapter },
    { provide: EXERCISE_SEEDER_PORT, useExisting: MongoExerciseSeederAdapter },
    ListLessonsByCourseService,
    GetLessonForViewerService,
    CheckLessonAccessService,
    ListLessonVersionsService,
    CreateLessonService,
    UpdateLessonService,
    SetLessonLockService,
    SoftDeleteLessonService,
    UpdateLessonAttachmentService,
    InstructorLessonAccessResolver,
    ListInstructorLessonsBySectionService,
    GetInstructorLessonDetailService,
    CreateInstructorLessonService,
    UpdateInstructorLessonService,
    SoftDeleteInstructorLessonService,
    ReorderInstructorLessonsService,
    UploadInstructorLessonAttachmentService,
  ],
  exports: [LESSON_READ_PORT],
})
export class LessonsModule {}
