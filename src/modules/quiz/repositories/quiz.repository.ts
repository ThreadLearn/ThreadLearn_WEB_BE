import { Injectable } from '@nestjs/common';
import { IQuiz, Quiz } from '../models/quiz.model';
import { CreateQuizDto } from '../schemas/quiz.schema';
import { IQuizRepository } from './quiz.repository.interface';

@Injectable()
export class QuizRepository implements IQuizRepository {
  async findById(id: string): Promise<IQuiz | null> {
    return Quiz.findById(id).exec();
  }

  async findByLessonId(lessonId: string): Promise<IQuiz | null> {
    return Quiz.findOne({ lessonId }).exec();
  }

  async create(dto: CreateQuizDto): Promise<IQuiz> {
    // Standard Mongoose model instantiation and saving
    return Quiz.create(dto);
  }

  async findAll(): Promise<IQuiz[]> {
    return Quiz.find().exec();
  }

  async delete(id: string): Promise<IQuiz | null> {
    return Quiz.findByIdAndDelete(id).exec();
  }
}
