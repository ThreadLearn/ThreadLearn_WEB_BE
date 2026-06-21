import { Injectable } from '@nestjs/common';
import { IQuiz, Quiz } from '../../../models/quiz.model';
import { CreateQuizDto, QuestionDto } from '../../../presentation/validators/quiz.validator';
import { IQuizRepository } from '../../../domain/interfaces/quiz.repository';

@Injectable()
export class QuizRepository implements IQuizRepository {
  async findById(id: string): Promise<IQuiz | null> {
    return Quiz.findById(id).exec();
  }

  async findByLessonId(lessonId: string): Promise<IQuiz | null> {
    return Quiz.findOne({ lessonId }).exec();
  }

  async create(dto: CreateQuizDto): Promise<IQuiz> {
    return Quiz.create(dto);
  }

  async findAll(): Promise<IQuiz[]> {
    return Quiz.find().exec();
  }

  async delete(id: string): Promise<IQuiz | null> {
    return Quiz.findByIdAndDelete(id).exec();
  }

  async addQuestion(quizId: string, question: QuestionDto): Promise<IQuiz | null> {
    return Quiz.findByIdAndUpdate(
      quizId,
      { $push: { questions: question } },
      { new: true, runValidators: true }
    ).exec();
  }

  async editQuestion(
    quizId: string,
    questionId: string,
    setFields: Record<string, any>
  ): Promise<IQuiz | null> {
    return Quiz.findOneAndUpdate(
      { _id: quizId, 'questions._id': questionId },
      { $set: setFields },
      { new: true, runValidators: true }
    ).exec();
  }

  async deleteQuestion(quizId: string, questionId: string): Promise<IQuiz | null> {
    return Quiz.findByIdAndUpdate(
      quizId,
      { $pull: { questions: { _id: questionId } } },
      { new: true }
    ).exec();
  }
}
