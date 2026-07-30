import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '../../../../common/api-handler';
import { ApiResponse } from '../../../../common/api-response';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../../../common/pipes/zod-validation.pipe';
import {
  CreateNoteDto,
  CreateLessonNoteDto,
  createLessonNoteSchema,
  createNoteSchema,
  ListNotesQueryDto,
  listNotesQuerySchema,
  UpdateNoteDto,
  noteIdParamSchema,
  updateNoteSchema,
} from '../../application/dto/note.dto';
import { CreateNoteService } from '../../application/services/create-note.service';
import { ListByLessonService } from '../../application/services/list-by-lesson.service';
import { ListMyNotesService } from '../../application/services/list-my-notes.service';
import { RemoveNoteService } from '../../application/services/remove-note.service';
import { SearchNotesService } from '../../application/services/search-notes.service';
import { UpdateNoteService } from '../../application/services/update-note.service';
import { CreateNoteFromCodeShareService } from '../../application/services/create-note-from-code-share.service';
import { z } from '../../../../common/zod/z';

const createFromCodeShareSchema = z.object({
  codeShareId: z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid code share id.'),
  lessonId: z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid lesson id.'),
  noteText: z.string().max(10000).optional(),
});

@ApiTags('Notes')
@Controller('v1/notes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('BearerAuth')
export class NotesController {
  constructor(
    private readonly listByLessonSvc: ListByLessonService,
    private readonly listMyNotesSvc: ListMyNotesService,
    private readonly searchNotesSvc: SearchNotesService,
    private readonly createNoteSvc: CreateNoteService,
    private readonly updateNoteSvc: UpdateNoteService,
    private readonly removeNoteSvc: RemoveNoteService,
    private readonly createFromCodeShareSvc: CreateNoteFromCodeShareService,
  ) {}

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listNotesQuerySchema)) query: ListNotesQueryDto
  ) {
    if (query.lessonId) {
      const notes = await this.listByLessonSvc.execute(user.id, query.lessonId);
      return ApiResponse.success({ message: 'Notes fetched.', data: notes });
    }

    const result = await this.listMyNotesSvc.execute(user.id, query.page, query.limit);
    return ApiResponse.success({
      message: 'Notes fetched.',
      data: result.data,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  }

  @Get('search')
  async search(@CurrentUser() user: AuthenticatedUser, @Query('q') query = '') {
    const notes = await this.searchNotesSvc.execute(user.id, query);
    return ApiResponse.success({ message: 'Notes fetched.', data: notes });
  }

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createNoteSchema)) body: CreateNoteDto
  ) {
    const note = await this.createNoteSvc.execute(user.id, body);
    return ApiResponse.success({ message: 'Note created.', data: note });
  }

  @Post('from-code-share')
  async createFromCodeShare(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createFromCodeShareSchema)) body: z.infer<typeof createFromCodeShareSchema>,
  ) {
    const note = await this.createFromCodeShareSvc.execute(user.id, user.role, body);
    return ApiResponse.success({ message: 'Community solution saved to notes.', data: note, statusCode: 201 });
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(noteIdParamSchema)) id: string,
    @Body(new ZodValidationPipe(updateNoteSchema)) body: UpdateNoteDto
  ) {
    const note = await this.updateNoteSvc.execute(user.id, id, body);
    return ApiResponse.success({ message: 'Note updated.', data: note });
  }

  @Delete(':id')
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(noteIdParamSchema)) id: string,
  ) {
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
    private readonly createNoteSvc: CreateNoteService
  ) {}

  @Get(':id/notes/me')
  async myLessonNotes(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(noteIdParamSchema)) id: string,
  ) {
    const notes = await this.listByLessonSvc.execute(user.id, id);
    return ApiResponse.success({ message: 'Notes fetched.', data: notes });
  }

  @Post(':id/notes')
  async createLessonNote(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(noteIdParamSchema)) id: string,
    @Body(new ZodValidationPipe(createLessonNoteSchema))
    body: CreateLessonNoteDto,
  ) {
    const note = await this.createNoteSvc.execute(user.id, {
      lessonId: id,
      noteText: body.noteText ?? body.content ?? '',
      codeSnippet: body.codeSnippet,
      anchorText: body.anchorText,
      anchorStart: body.anchorStart,
      anchorEnd: body.anchorEnd,
    });
    return ApiResponse.success({ message: 'Note created.', data: note });
  }
}
