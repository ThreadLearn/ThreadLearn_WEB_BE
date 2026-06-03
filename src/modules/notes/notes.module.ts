import { Module } from '@nestjs/common';
import { NotesController } from './controllers/notes.controller';
import { NotesService } from './services/notes.service';

@Module({
  controllers: [NotesController],
  providers: [NotesService],
  exports: [NotesService],
})
export class NotesModule {}
