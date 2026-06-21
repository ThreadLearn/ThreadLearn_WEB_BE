import { Inject, Injectable } from '@nestjs/common';
import { isValidObjectId } from 'mongoose';
import { BadRequestError, NotFoundError } from '../../../../common/custom-error';
import { QuestionDto } from '../../presentation/validators/quiz.validator';
import { IQuizRepository } from '../../domain/ports/quiz.repository.interface';

/**
 * UC37: Add Question (Admin)
 * Service to add a new question to a quiz.
 */
@Injectable()
export class AddQuestionService {
  constructor(
    @Inject('IQuizRepository')
    private readonly quizRepository: IQuizRepository,
  ) {}

  async execute(quizId: string, question: QuestionDto) {
    if (!isValidObjectId(quizId)) {
      throw new BadRequestError('Invalid quiz id.');
    }

    const quiz = await this.quizRepository.findById(quizId);
    if (!quiz) {
      throw new NotFoundError('Quiz not found.');
    }

    return this.quizRepository.addQuestion(quizId, question);
  }
}
