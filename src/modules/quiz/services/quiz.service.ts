// src/modules/quiz/services/quiz.service.ts

import { isValidObjectId } from 'mongoose';
import { Quiz } from '../models/quiz.model';
import { Lesson } from '@/database/models';
import { BadRequestError, NotFoundError } from '../../../common/custom-error';
import { CreateQuizDto, QuestionDto, UpdateQuizDto } from '../schemas/quiz.schema';

export class QuizService {
  // ════════════════════════════════════════════════════════════
  //  UC36 — Admin Quiz CRUD
  // ════════════════════════════════════════════════════════════

  // ─── UC36-1: Tạo quiz ──────────────────────────────────────
  async createQuiz(dto: CreateQuizDto) {
    this.assertObjectId(dto.lessonId, 'lesson');

    const lesson = await Lesson.findById(dto.lessonId);
    if (!lesson) throw new NotFoundError('Lesson not found.');

    const existing = await Quiz.findOne({ lessonId: dto.lessonId });
    if (existing) throw new BadRequestError('Quiz already exists for this lesson.');

    return await Quiz.create(dto);
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
    this.assertObjectId(quizId, 'quiz');
    const quiz = await Quiz.findByIdAndUpdate(
      quizId,
      { $push: { questions: question } },
      { new: true, runValidators: true }
    );
    if (!quiz) throw new NotFoundError('Quiz not found.');
    return quiz;
  }

  // ════════════════════════════════════════════════════════════
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

export default QuizService;
