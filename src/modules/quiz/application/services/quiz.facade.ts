// src/modules/quiz/application/services/quiz.facade.ts

import { Inject, Injectable } from '@nestjs/common';
import { isValidObjectId } from 'mongoose';
import { Quiz } from '../../models/quiz.model';
import { BadRequestError, NotFoundError } from '../../../../common/custom-error';
import { CreateQuizDto, QuestionDto, UpdateQuestionDto, UpdateQuizDto } from '../../presentation/validators/quiz.validator';
import { IQuizRepository } from '../../domain/interfaces/quiz.repository';
import { CreateQuizService } from './create-quiz.service';
import { AddQuestionService } from './add-question.service';
import { EditQuestionService } from './edit-question.service';
import { DeleteQuestionService } from './delete-question.service';

@Injectable()
export class QuizService {
  constructor(
    @Inject('IQuizRepository')
    private readonly quizRepository: IQuizRepository,
    private readonly createQuizService: CreateQuizService,
    private readonly addQuestionService: AddQuestionService,
    private readonly editQuestionService: EditQuestionService,
    private readonly deleteQuestionService: DeleteQuestionService,
  ) {}

  // ════════════════════════════════════════════════════════════
  //  UC36 — Admin Quiz CRUD
  // ════════════════════════════════════════════════════════════

  // ─── UC36-1: Tạo quiz ──────────────────────────────────────
  async createQuiz(dto: CreateQuizDto) {
    return this.createQuizService.execute(dto);
  }

  // ─── UC36-2: Cập nhật quiz ─────────────────────────────────
  async updateQuiz(quizId: string, dto: UpdateQuizDto) {
    this.assertObjectId(quizId, 'quiz');
    const quiz = await Quiz.findByIdAndUpdate(
      quizId,
      { $set: dto }, // dùng $set tránh ghi đè toàn bộ document
      { new: true, runValidators: true }
    );
    if (!quiz) throw new NotFoundError('Quiz not found.');
    return quiz;
  }

  // ─── UC36-3: Xem chi tiết quiz ─────────────────────────────
  async getQuizById(quizId: string) {
    this.assertObjectId(quizId, 'quiz');
    const quiz = await Quiz.findById(quizId).lean();
    if (!quiz) throw new NotFoundError('Quiz not found.');
    return quiz;
  }

  // ─── UC36-4: Xóa quiz ──────────────────────────────────────
  async deleteQuiz(quizId: string) {
    this.assertObjectId(quizId, 'quiz');
    const quiz = await Quiz.findByIdAndDelete(quizId).lean();
    if (!quiz) throw new NotFoundError('Quiz not found.');
    return quiz;
  }

  // ─── UC36-5: Xem danh sách quiz ────────────────────────────
  async getAllQuizzes() {
    return await Quiz.find().lean();
  }

  // ════════════════════════════════════════════════════════════
  //  UC37 — Add Question (Admin)
  // ════════════════════════════════════════════════════════════

  // ─── UC37: Thêm 1 câu hỏi vào quiz đã tồn tại ──────────────
  async addQuestion(quizId: string, question: QuestionDto) {
    return this.addQuestionService.execute(quizId, question);
  }

  // ════════════════════════════════════════════════════════════
  //  UC38 — Edit Question (Admin)
  // ════════════════════════════════════════════════════════════

  // ─── UC38: Cập nhật 1 câu hỏi trong quiz ───────────────────
  async editQuestion(
    quizId: string,
    questionId: string,
    dto: UpdateQuestionDto,
  ) {
    return this.editQuestionService.execute(quizId, questionId, dto);
  }

  // ─── UC39: Xóa 1 câu hỏi khỏi quiz ────────────────────────
  async deleteQuestion(quizId: string, questionId: string) {
    return this.deleteQuestionService.execute(quizId, questionId);
  }

  //  Student
  // ════════════════════════════════════════════════════════════

  // ─── Lấy quiz theo lesson (ẩn correctAnswerIndex khỏi student) ─
  async getQuizByLesson(lessonId: string) {
    this.assertObjectId(lessonId, 'lesson');
    const quiz = await Quiz.findOne({ lessonId }).lean();
    if (!quiz) throw new NotFoundError('Quiz not found for this lesson.');
    return this.toStudentQuiz(quiz);
  }

  // ─── Helpers ───────────────────────────────────────────────
  private assertObjectId(id: string, resource: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestError(`Invalid ${resource} id.`);
    }
  }

  private toStudentQuiz(quiz: any) {
    return {
      ...quiz,
      questions: quiz.questions.map(
        ({ correctAnswerIndex: _answer, ...question }: any) => question
      ),
    };
  }
}
