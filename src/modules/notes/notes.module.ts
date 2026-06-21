import { Module } from '@nestjs/common';
import { LearningAccessModule } from '../../shared/application/learning-access/learning-access.module';
import { NotesController } from './controllers/notes.controller';
import { NotesService } from './services/notes.service';

@Module({
  imports: [LearningAccessModule],
  controllers: [NotesController],
  providers: [NotesService],
  exports: [NotesService],
})
export class NotesModule {}
