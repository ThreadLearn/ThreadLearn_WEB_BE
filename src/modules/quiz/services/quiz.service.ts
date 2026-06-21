// src/modules/quiz/services/quiz.service.ts

import { Inject, Injectable } from '@nestjs/common';
import { isValidObjectId } from 'mongoose';
import { Quiz } from '../models/quiz.model';
import { BadRequestError, NotFoundError } from '../../../common/custom-error';
import { CreateQuizDto } from '../schemas/quiz.schema';
import { IQuizRepository } from '../repositories/quiz.repository.interface';
import { CreateQuizUseCase } from '../use-cases/create-quiz.use-case';

@Injectable()
export class QuizService {
  constructor(
    @Inject('IQuizRepository')
    private readonly quizRepository: IQuizRepository,
    private readonly createQuizUseCase: CreateQuizUseCase,
  ) {}

  // ─── Student ───────────────────────────────────────────────
  async getQuizByLesson(lessonId: string) {
    this.assertObjectId(lessonId, 'lesson');
    const quiz = await Quiz.findOne({ lessonId }).lean();
    if (!quiz) throw new NotFoundError('Quiz not found for this lesson.');
    return quiz;
  }

  // ─── UC36-1: Admin tạo quiz ────────────────────────────────
  async createQuiz(dto: CreateQuizDto) {
    return this.createQuizUseCase.execute(dto);
  }

  // ─── UC36-2: Admin cập nhật quiz ──────────────────────────
  async updateQuiz(quizId: string, dto: Partial<CreateQuizDto>) {
    this.assertObjectId(quizId, 'quiz');
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
    this.assertObjectId(quizId, 'quiz');
    const quiz = await Quiz.findById(quizId).lean();
    if (!quiz) throw new NotFoundError('Quiz not found.');
    return quiz;
  }

  // ─── UC36-4: Admin xóa quiz ───────────────────────────────
  async deleteQuiz(quizId: string) {
    this.assertObjectId(quizId, 'quiz');
    const quiz = await Quiz.findByIdAndDelete(quizId).lean();
    if (!quiz) throw new NotFoundError('Quiz not found.');
    return quiz;
  }

  private assertObjectId(id: string, resource: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestError(`Invalid ${resource} id.`);
    }
  }
}

export default QuizService;
