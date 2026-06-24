import { Module } from '@nestjs/common';
import { LearningAccessModule } from '../../shared/application/learning-access/learning-access.module';
import { ListByLessonService } from './application/services/list-by-lesson.service';
import { RemoveNoteService } from './application/services/remove-note.service';
import { SearchNotesService } from './application/services/search-notes.service';
import { UpdateNoteService } from './application/services/update-note.service';
import { UpsertNoteService } from './application/services/upsert-note.service';
import { NOTE_REPOSITORY } from './domain/interfaces/note.repository';
import { MongoNoteRepository } from './infrastructure/persistence/mongo-note.repository';
import { LessonNotesController, NotesController } from './presentation/controller/notes.controller';

@Module({
  imports: [LearningAccessModule],
  controllers: [NotesController, LessonNotesController],
  providers: [
    MongoNoteRepository,
    { provide: NOTE_REPOSITORY, useExisting: MongoNoteRepository },
    ListByLessonService,
    SearchNotesService,
    UpsertNoteService,
    UpdateNoteService,
    RemoveNoteService,
  ],
})
export class NotesModule {}
