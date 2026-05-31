import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { NoteService } from '../services/note.service';
import { CreateNoteDto, UpdateNoteDto } from '../dto/note.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator';

@ApiTags('notes')
@Controller('notes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('STUDENT')
@ApiBearerAuth()
export class NoteController {
  constructor(private readonly noteService: NoteService) {}

  @Get()
  async getMyNotes(
    @CurrentUser() user: JwtPayload,
    @Query('lessonId') lessonId: string,
  ) {
    const data = await this.noteService.getMyNotesInLesson(user.id, lessonId);
    return { message: 'Notes fetched.', data };
  }

  @Post()
  async createNote(@CurrentUser() user: JwtPayload, @Body() dto: CreateNoteDto) {
    const data = await this.noteService.createNote(user.id, dto);
    return { message: 'Note created.', data, statusCode: 201 };
  }

  @Patch(':noteId')
  async updateNote(
    @CurrentUser() user: JwtPayload,
    @Param('noteId') noteId: string,
    @Body() dto: UpdateNoteDto,
  ) {
    const data = await this.noteService.updateNote(user.id, noteId, dto.noteContent);
    return { message: 'Note updated.', data };
  }

  @Delete(':noteId')
  @HttpCode(200)
  async deleteNote(
    @CurrentUser() user: JwtPayload,
    @Param('noteId') noteId: string,
  ) {
    await this.noteService.deleteNote(user.id, noteId);
    return { message: 'Note deleted.' };
  }
}
