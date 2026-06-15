// src/modules/quiz/services/quiz.service.ts

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types, isValidObjectId } from 'mongoose';
import { Quiz, QuizDocument } from '../schemas/quiz.schema';
import { NotFoundError, BadRequestError } from '../../../common/custom-error';
import { CreateQuizDto, QuestionDto, QueryQuizDto, UpdateQuizDto } from '../dto';
import { Lesson, LessonDocument } from '@/modules/lessons/schemas/lesson.schema';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';

@Injectable()
export class QuizService {
  constructor(
    @InjectModel(Quiz.name) private readonly quizModel: Model<QuizDocument>,
    @InjectModel(Lesson.name) private readonly lessonModel: Model<LessonDocument>,
  ) {}

  private assertObjectId(id: string, label = 'ID'): void {
    if (!isValidObjectId(id)) {
      throw new BadRequestError(`Invalid ${label}.`);
    }
  }

  // ════════════════════════════════════════════════════════════
  //  UC36 — Admin Quiz CRUD
  // ════════════════════════════════════════════════════════════

  // ─── UC36-1: Tạo quiz ──────────────────────────────────────
  async createQuiz(dto: CreateQuizDto, userId: string): Promise<QuizDocument> {
    this.assertObjectId(dto.lessonId, 'lesson ID');
    this.assertObjectId(userId, 'user ID');

    const lesson = await this.lessonModel.findById(dto.lessonId);
    if (!lesson) throw new NotFoundError('Lesson not found.');

    const existing = await this.quizModel.findOne({
      lessonId: dto.lessonId,
      isDeleted: { $ne: true },
    });
    if (existing) throw new BadRequestError('Quiz already exists for this lesson.');

    return this.quizModel.create({
      ...dto,
      createdBy: new Types.ObjectId(userId),
    });
  }

  // ─── UC36-2: Cập nhật quiz ─────────────────────────────────
  async updateQuiz(quizId: string, dto: UpdateQuizDto): Promise<QuizDocument> {
    this.assertObjectId(quizId, 'quiz ID');

    const quiz = await this.quizModel.findOneAndUpdate(
      { _id: quizId, isDeleted: { $ne: true } },
      { $set: dto },
      { new: true, runValidators: true },
    );
    if (!quiz) throw new NotFoundError('Quiz not found.');
    return quiz;
  }

  // ─── UC36-3: Xem chi tiết quiz ─────────────────────────────
  async getQuizById(quizId: string): Promise<QuizDocument> {
    this.assertObjectId(quizId, 'quiz ID');

    const quiz = await this.quizModel.findOne({
      _id: quizId,
      isDeleted: { $ne: true },
    });
    if (!quiz) throw new NotFoundError('Quiz not found.');
    return quiz;
  }

  // ─── UC36-4: Xóa quiz (soft-delete) ────────────────────────
  async deleteQuiz(quizId: string): Promise<QuizDocument> {
    this.assertObjectId(quizId, 'quiz ID');

    const quiz = await this.quizModel.findOneAndUpdate(
      { _id: quizId, isDeleted: { $ne: true } },
      { $set: { isDeleted: true } },
      { new: true },
    );
    if (!quiz) throw new NotFoundError('Quiz not found.');
    return quiz;
  }

  // ─── UC36-5: Xem danh sách quiz (pagination + filter) ──────
  async getAllQuizzes(query: QueryQuizDto): Promise<PaginatedResult<QuizDocument>> {
    const { page, limit, search, lessonId, status } = query;

    const filter: FilterQuery<QuizDocument> = { isDeleted: { $ne: true } };

    if (lessonId) {
      this.assertObjectId(lessonId, 'lesson ID');
      filter.lessonId = new Types.ObjectId(lessonId);
    }
    if (status) filter.status = status;
    if (search) filter.title = { $regex: search, $options: 'i' };

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.quizModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      this.quizModel.countDocuments(filter),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
    };
  }

  // ════════════════════════════════════════════════════════════
  //  UC37 — Add Question (Admin)
  // ════════════════════════════════════════════════════════════

  async addQuestion(quizId: string, question: QuestionDto): Promise<QuizDocument> {
    this.assertObjectId(quizId, 'quiz ID');

    const quiz = await this.quizModel.findOneAndUpdate(
      { _id: quizId, isDeleted: { $ne: true } },
      { $push: { questions: question } },
      { new: true, runValidators: true },
    );
    if (!quiz) throw new NotFoundError('Quiz not found.');
    return quiz;
  }

  // ─── Student: lấy quiz theo lesson ─────────────────────────
  // NOTE: chưa sanitize correctAnswerIndex / chưa filter status=PUBLISHED
  // (ngoài phạm vi UC36/37 — sẽ làm khi tới student view).
  async getQuizByLesson(lessonId: string): Promise<QuizDocument> {
    this.assertObjectId(lessonId, 'lesson ID');

    const quiz = await this.quizModel.findOne({
      lessonId,
      isDeleted: { $ne: true },
    });
    if (!quiz) throw new NotFoundError('Quiz not found for this lesson.');
    return quiz;
  }
}
