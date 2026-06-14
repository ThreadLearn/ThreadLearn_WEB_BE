// src/modules/quiz/services/quiz.service.ts

import { isValidObjectId } from 'mongoose';
import { Quiz } from '../models/quiz.model';
import { Lesson } from '@/database/models';
import { NotFoundError, BadRequestError } from '../../../common/custom-error';
import { CreateQuizDto, UpdateQuizDto } from '../schemas/quiz.schema';

export class QuizService {
  // ════════════════════════════════════════════════════════════
  //  UC36 — Admin Quiz CRUD
  // ════════════════════════════════════════════════════════════

  // ─── UC36-1: Tạo quiz ──────────────────────────────────────
  async createQuiz(dto: CreateQuizDto) {
    if (!isValidObjectId(dto.lessonId)) {
      throw new BadRequestError('Invalid lesson ID.');
    }

    const lesson = await Lesson.findById(dto.lessonId);
    if (!lesson) throw new NotFoundError('Lesson not found.');

    const existing = await Quiz.findOne({ lessonId: dto.lessonId });
    if (existing) throw new BadRequestError('Quiz already exists for this lesson.');

    return await Quiz.create(dto);
  }

  // ─── UC36-2: Cập nhật quiz ─────────────────────────────────
  async updateQuiz(quizId: string, dto: UpdateQuizDto) {
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
    const quiz = await Quiz.findById(quizId).lean();
    if (!quiz) throw new NotFoundError('Quiz not found.');
    return quiz;
  }

  // ─── UC36-4: Xóa quiz ──────────────────────────────────────
  async deleteQuiz(quizId: string) {
    const quiz = await Quiz.findByIdAndDelete(quizId).lean();
    if (!quiz) throw new NotFoundError('Quiz not found.');
    return quiz;
  }

  // ─── UC36-5: Xem danh sách quiz ────────────────────────────
  async getAllQuizzes() {
    return await Quiz.find().lean();
  }

  // ════════════════════════════════════════════════════════════
  //  Student
  // ════════════════════════════════════════════════════════════

  // ─── Lấy quiz theo lesson ──────────────────────────────────
  async getQuizByLesson(lessonId: string) {
    const quiz = await Quiz.findOne({ lessonId });
    if (!quiz) throw new NotFoundError('Quiz not found for this lesson.');
    return quiz;
  }
}

export default QuizService;