import {
  Body, Controller, Delete, Get, HttpCode, Patch,
  Param, Post, Put, Query, Res, UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../../../common/api-handler';
import { ApiResponse } from '../../../../common/api-response';
import { BadRequestError } from '../../../../common/custom-error';
import { env } from '../../../../configs/env';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../../../common/pipes/zod-validation.pipe';
import { CreateQuizService } from '../../application/services/create-quiz.service';
import { UpdateQuizService } from '../../application/services/update-quiz.service';
import { GetQuizService } from '../../application/services/get-quiz.service';
import { DeleteQuizService } from '../../application/services/delete-quiz.service';
import { ListQuizzesService } from '../../application/services/list-quizzes.service';
import { AddQuestionService } from '../../application/services/add-question.service';
import { EditQuestionService } from '../../application/services/edit-question.service';
import { DeleteQuestionService } from '../../application/services/delete-question.service';
import { GetQuizByLessonService } from '../../application/services/get-quiz-by-lesson.service';
import { QuizBankService } from '../../application/services/quiz-bank.service';

import {
  createQuizSchema, CreateQuizDto,
  updateQuizSchema, UpdateQuizDto,
  addQuestionSchema, QuestionDto,
  updateQuestionSchema, UpdateQuestionDto,
} from '../validators/quiz.validator';
import { QuizPresenter } from '../response/quiz.presenter';
import type { Response } from 'express';

/**
 * QuizController — luồng ADMIN quản lý quiz & câu hỏi (UC36–UC39).
 * Luồng học viên làm quiz nằm ở QuizAttemptsController.
 */
@ApiTags('Quiz - Admin')
@Controller('v1/quiz')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('BearerAuth')
export class QuizController {
  constructor(
    private readonly createQuiz: CreateQuizService,
    private readonly updateQuiz: UpdateQuizService,
    private readonly getQuiz: GetQuizService,
    private readonly deleteQuiz: DeleteQuizService,
    private readonly listQuizzes: ListQuizzesService,
    private readonly addQuestion: AddQuestionService,
    private readonly editQuestion: EditQuestionService,
    private readonly deleteQuestion: DeleteQuestionService,
    private readonly getQuizByLesson: GetQuizByLessonService,
    private readonly quizBank: QuizBankService,
  ) { }

  @Get('import-template')
  @Roles('ADMIN')
  async downloadImportTemplate(@Query('format') format: string | undefined, @Res({ passthrough: true }) response: Response) {
    if (format && format !== 'xlsx') throw new BadRequestError('Only xlsx templates are supported.');
    response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    response.setHeader('Content-Disposition', 'attachment; filename="threadlearn-quiz-library-template.xlsx"');
    return this.quizBank.buildXlsxTemplate();
  }

  /** Admin tải thư viện đề theo 2 bước parse/preview rồi commit. */
  @Post('imports')
  @HttpCode(201)
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024, files: 1 },
  }))
  @ApiConsumes('multipart/form-data')
  async uploadQuestionBank(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: { quizId?: string; lessonId?: string; title?: string; questionCount?: string },
  ) {
    const questionCount = body.questionCount === undefined || body.questionCount === ''
      ? undefined
      : Number(body.questionCount);
    const result = await this.quizBank.createImport({
      quizId: body.quizId,
      lessonId: body.lessonId,
      title: body.title,
      questionCount,
      userId: user.id,
      file: file as Express.Multer.File,
    });
    return ApiResponse.success({ message: 'Question library parsed. Review it before publishing.', data: result, statusCode: 201 });
  }

  @Get('imports/:importId')
  @Roles('ADMIN')
  async getQuestionBankImport(
    @Param('importId') importId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.quizBank.getImport(importId, user, Number(page) || 1, Number(limit) || 50);
    return ApiResponse.success({ message: 'Question library import fetched.', data: result, meta: result.meta });
  }

  @Post('imports/:importId/commit')
  @Roles('ADMIN')
  async commitQuestionBankImport(
    @Param('importId') importId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.quizBank.commitImport(importId, user);
    return ApiResponse.success({ message: 'Question library published.', data: result });
  }

  @Patch('imports/:importId/items/:row')
  @Roles('ADMIN')
  async updateQuestionBankImportItem(
    @Param('importId') importId: string,
    @Param('row') row: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.quizBank.updateImportItem(importId, Number(row), body as any, user);
    return ApiResponse.success({ message: 'Import row updated.', data: result });
  }

  @Delete('imports/:importId/items/:row')
  @Roles('ADMIN')
  async removeQuestionBankImportItem(
    @Param('importId') importId: string,
    @Param('row') row: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.quizBank.removeImportItem(importId, Number(row), user);
    return ApiResponse.success({ message: 'Import row removed.', data: result });
  }

  @Get(':quizId/question-bank')
  @Roles('ADMIN')
  async getQuestionBank(@Param('quizId') quizId: string) {
    const result = await this.quizBank.getBankSummary(quizId);
    return ApiResponse.success({ message: 'Question library fetched.', data: result });
  }

  @Get(':quizId/question-bank/questions')
  @Roles('ADMIN')
  async listQuestionBankQuestions(@Param('quizId') quizId: string, @Query() query: Record<string, string | undefined>) {
    const result = await this.quizBank.listQuestions(quizId, {
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
      search: query.search,
      status: query.status,
      difficulty: query.difficulty,
      tag: query.tag,
      sort: query.sort,
    });
    return ApiResponse.success({ message: 'Question bank questions fetched.', data: result.items, meta: result.meta });
  }

  @Post(':quizId/question-bank/questions')
  @HttpCode(201)
  @Roles('ADMIN')
  async createQuestionBankQuestion(@Param('quizId') quizId: string, @Body() body: Record<string, unknown>) {
    const result = await this.quizBank.createQuestion(quizId, body as any);
    return ApiResponse.success({ message: 'Question bank question created.', data: result, statusCode: 201 });
  }

  @Get(':quizId/question-bank/questions/:questionId')
  @Roles('ADMIN')
  async getQuestionBankQuestion(@Param('quizId') quizId: string, @Param('questionId') questionId: string) {
    const result = await this.quizBank.getQuestion(quizId, questionId);
    return ApiResponse.success({ message: 'Question bank question fetched.', data: result });
  }

  @Patch(':quizId/question-bank/questions/:questionId')
  @Roles('ADMIN')
  async updateQuestionBankQuestion(@Param('quizId') quizId: string, @Param('questionId') questionId: string, @Body() body: Record<string, unknown>) {
    const result = await this.quizBank.updateQuestion(quizId, questionId, body as any);
    return ApiResponse.success({ message: 'Question bank question updated.', data: result });
  }

  @Patch(':quizId/question-bank/questions/:questionId/status')
  @Roles('ADMIN')
  async setQuestionBankQuestionStatus(
    @Param('quizId') quizId: string,
    @Param('questionId') questionId: string,
    @Body() body: { status?: 'active' | 'disabled' },
  ) {
    if (body.status !== 'active' && body.status !== 'disabled') throw new BadRequestError('status must be active or disabled.');
    const result = await this.quizBank.setQuestionStatus(quizId, questionId, body.status);
    return ApiResponse.success({ message: 'Question bank question status updated.', data: result });
  }

  // ─── UC36-1: Admin tạo quiz ──────────────────────────────
  @Post()
  @HttpCode(201)
  @Roles('ADMIN')
  async create(@Body(new ZodValidationPipe(createQuizSchema)) dto: CreateQuizDto) {
    const quiz = await this.createQuiz.execute(dto);
    return ApiResponse.success({ message: 'Quiz created successfully.', data: QuizPresenter.toResponse(quiz), statusCode: 201 });
  }

  // ─── UC36-5: Admin xem danh sách quiz ────────────────────
  @Get()
  @Roles('ADMIN')
  async list() {
    const quizzes = await this.listQuizzes.execute();
    return ApiResponse.success({ message: 'Quizzes fetched successfully.', data: QuizPresenter.toList(quizzes) });
  }

  // ─── UC37: Admin thêm câu hỏi ────────────────────────────
  @Post(':quizId/questions')
  @HttpCode(201)
  @Roles('ADMIN')
  async addQuestionToQuiz(
    @Param('quizId') quizId: string,
    @Body(new ZodValidationPipe(addQuestionSchema)) question: QuestionDto,
  ) {
    const quiz = await this.addQuestion.execute(quizId, question);
    return ApiResponse.success({ message: 'Question added successfully.', data: QuizPresenter.toResponse(quiz) });
  }

  // ─── UC38: Admin sửa câu hỏi ──────────────────────────────
  @Put(':quizId/questions/:questionId')
  @Roles('ADMIN')
  async editQuestionInQuiz(
    @Param('quizId') quizId: string,
    @Param('questionId') questionId: string,
    @Body(new ZodValidationPipe(updateQuestionSchema)) dto: UpdateQuestionDto,
  ) {
    const quiz = await this.editQuestion.execute(quizId, questionId, dto);
    return ApiResponse.success({ message: 'Question updated successfully.', data: QuizPresenter.toResponse(quiz) });
  }

  // ─── UC39: Admin xoá câu hỏi ──────────────────────────────
  @Delete(':quizId/questions/:questionId')
  @HttpCode(200)
  @Roles('ADMIN')
  async removeQuestionFromQuiz(
    @Param('quizId') quizId: string,
    @Param('questionId') questionId: string,
  ) {
    const quiz = await this.deleteQuestion.execute(quizId, questionId);
    return ApiResponse.success({ message: 'Question deleted successfully.', data: QuizPresenter.toResponse(quiz) });
  }

  // ─── UC36-3: Admin xem chi tiết quiz ─────────────────────
  @Get(':quizId')
  @Roles('ADMIN')
  async getById(@Param('quizId') quizId: string) {
    const quiz = await this.getQuiz.execute(quizId);
    return ApiResponse.success({ message: 'Quiz fetched successfully.', data: QuizPresenter.toResponse(quiz) });
  }

  // ─── UC36-2: Admin cập nhật quiz ─────────────────────────
  @Put(':quizId')
  @Roles('ADMIN')
  async update(
    @Param('quizId') quizId: string,
    @Body(new ZodValidationPipe(updateQuizSchema)) dto: UpdateQuizDto,
  ) {
    const quiz = await this.updateQuiz.execute(quizId, dto);
    return ApiResponse.success({ message: 'Quiz updated successfully.', data: QuizPresenter.toResponse(quiz) });
  }

  // ─── UC36-4: Admin xóa quiz ──────────────────────────────
  @Delete(':quizId')
  @HttpCode(200)
  @Roles('ADMIN')
  async remove(@Param('quizId') quizId: string) {
    await this.deleteQuiz.execute(quizId);
    return ApiResponse.success({ message: 'Quiz deleted successfully.', data: null });
  }
}
