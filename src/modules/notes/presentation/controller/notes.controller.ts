import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '../../../../common/api-handler';
import { ApiResponse } from '../../../../common/api-response';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { ListByLessonService } from '../../application/services/list-by-lesson.service';
import { RemoveNoteService } from '../../application/services/remove-note.service';
import { SearchNotesService } from '../../application/services/search-notes.service';
import { UpdateNoteService } from '../../application/services/update-note.service';
import { UpsertNoteService } from '../../application/services/upsert-note.service';

@ApiTags('Notes')
@Controller('v1/notes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('BearerAuth')
export class NotesController {
  constructor(
    private readonly listByLessonSvc: ListByLessonService,
    private readonly searchNotesSvc: SearchNotesService,
    private readonly upsertNoteSvc: UpsertNoteService,
    private readonly updateNoteSvc: UpdateNoteService,
    private readonly removeNoteSvc: RemoveNoteService,
  ) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser, @Query('lessonId') lessonId?: string) {
    const notes = lessonId ? await this.listByLessonSvc.execute(user.id, lessonId) : [];
    return ApiResponse.success({ message: 'Notes fetched.', data: notes });
  }

  @Get('search')
  async search(@CurrentUser() user: AuthenticatedUser, @Query('q') query = '') {
    const notes = await this.searchNotesSvc.execute(user.id, query);
    return ApiResponse.success({ message: 'Notes fetched.', data: notes });
  }

  @Post()
  async upsert(@CurrentUser() user: AuthenticatedUser, @Body() body: { lessonId: string; noteText: string; codeSnippet?: string }) {
    const note = await this.upsertNoteSvc.execute(user.id, body);
    return ApiResponse.success({ message: 'Note saved.', data: note });
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { noteText?: string; content?: string; codeSnippet?: string },
  ) {
    const note = await this.updateNoteSvc.execute(user.id, id, body);
    return ApiResponse.success({ message: 'Note updated.', data: note });
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const result = await this.removeNoteSvc.execute(user.id, id);
    return ApiResponse.success({ message: 'Note deleted.', data: result });
  }
}

@ApiTags('Lessons')
@Controller('v1/lessons')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('BearerAuth')
export class LessonNotesController {
  constructor(
    private readonly listByLessonSvc: ListByLessonService,
    private readonly upsertNoteSvc: UpsertNoteService,
  ) {}

  @Get(':id/notes/me')
  async myLessonNotes(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const notes = await this.listByLessonSvc.execute(user.id, id);
    return ApiResponse.success({ message: 'Notes fetched.', data: notes });
  }

  @Post(':id/notes')
  async upsertLessonNote(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { noteText?: string; content?: string; codeSnippet?: string },
  ) {
    const note = await this.upsertNoteSvc.execute(user.id, {
      lessonId: id,
      noteText: body.noteText ?? body.content ?? '',
      codeSnippet: body.codeSnippet,
    });
    return ApiResponse.success({ message: 'Note saved.', data: note });
  }
}
