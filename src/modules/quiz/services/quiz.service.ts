// src/modules/quiz/services/quiz.service.ts

import { Quiz } from '../models/quiz.model';
import { NotFoundError, BadRequestError } from '../../../common/custom-error';
import { CreateQuizDto, UpdateQuizDto } from '../schemas/quiz.schema';

export class QuizService {

  // ─── Student ───────────────────────────────────────────────
  async getQuizByLesson(lessonId: string) {
    const quiz = await Quiz.findOne({ lessonId });
    if (!quiz) throw new NotFoundError('Quiz not found for this lesson.');
    return quiz;
  }

  // ─── UC36-1: Admin tạo quiz ────────────────────────────────
  async createQuiz(dto: CreateQuizDto) {
    const existing = await Quiz.findOne({ lessonId: dto.lessonId });
    if (existing) throw new BadRequestError('Quiz already exists for this lesson.');
    return await Quiz.create(dto);
  }

  // ─── UC36-2: Admin cập nhật quiz ──────────────────────────
  async updateQuiz(quizId: string, dto: UpdateQuizDto) {
    const quiz = await Quiz.findByIdAndUpdate(
      quizId,
      { $set: dto },   // dùng $set tránh ghi đè toàn bộ document
      { new: true, runValidators: true }
    );
    if (!quiz) throw new NotFoundError('Quiz not found.');
    return quiz;
  }

  // ─── UC36-3: Admin xem chi tiết quiz ──────────────────────
  async getQuizById(quizId: string) {
    const quiz = await Quiz.findById(quizId).lean();
    if (!quiz) throw new NotFoundError('Quiz not found.');
    return quiz;
  }

  // ─── UC36-4: Admin xóa quiz ───────────────────────────────
  async deleteQuiz(quizId: string) {
    const quiz = await Quiz.findByIdAndDelete(quizId).lean();
    if (!quiz) throw new NotFoundError('Quiz not found.');
    return quiz;
  }
}

export default QuizService;
