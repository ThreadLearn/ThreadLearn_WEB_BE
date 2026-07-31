import { Module } from '@nestjs/common';
import { LearningAccessModule } from '../../shared/application/learning-access/learning-access.module';
import { ListByLessonService } from './application/services/list-by-lesson.service';
import { CreateNoteService } from './application/services/create-note.service';
import { ListMyNotesService } from './application/services/list-my-notes.service';
import { RemoveNoteService } from './application/services/remove-note.service';
import { SearchNotesService } from './application/services/search-notes.service';
import { UpdateNoteService } from './application/services/update-note.service';
import { CreateNoteFromCodeShareService } from './application/services/create-note-from-code-share.service';
import { CodeShareModule } from '../code-share/code-share.module';
import { NOTE_REPOSITORY } from './domain/interfaces/note.repository';
import { MongoNoteRepository } from './infrastructure/persistence/mongo-note.repository';
import { LessonNotesController, NotesController } from './presentation/controller/notes.controller';

@Module({
  imports: [LearningAccessModule, CodeShareModule],
  controllers: [NotesController, LessonNotesController],
  providers: [
    MongoNoteRepository,
    { provide: NOTE_REPOSITORY, useExisting: MongoNoteRepository },
    ListByLessonService,
    ListMyNotesService,
    SearchNotesService,
    CreateNoteService,
    UpdateNoteService,
    RemoveNoteService,
    CreateNoteFromCodeShareService,
  ],
})
export class NotesModule {}
