import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NoteController } from './controllers/note.controller';
import { NoteService } from './services/note.service';
import { NoteSchema } from './models/note.model';
import { LessonSchema } from '../lessons/models/lesson.model';
import { EnrollmentSchema } from '../enrollments/models/enrollment.model';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Note',       schema: NoteSchema },
      { name: 'Lesson',     schema: LessonSchema },
      { name: 'Enrollment', schema: EnrollmentSchema },
    ]),
  ],
  controllers: [NoteController],
  providers:   [NoteService],
  exports:     [NoteService],
})
export class NoteModule {}
