import { Inject, Injectable } from '@nestjs/common';
import { isValidObjectId } from 'mongoose';
import { BadRequestError, NotFoundError } from '../../../../common/custom-error';
import { IQuizRepository } from '../../domain/interfaces/quiz.repository';

/**
 * UC39: Delete Question (Admin)
 * Service to delete a question from a quiz. Ensures at least 1 question remains.
 */
@Injectable()
export class DeleteQuestionService {
  constructor(
    @Inject('IQuizRepository')
    private readonly quizRepository: IQuizRepository,
  ) {}

  async execute(quizId: string, questionId: string) {
    if (!isValidObjectId(quizId)) {
      throw new BadRequestError('Invalid quiz id.');
    }
    if (!isValidObjectId(questionId)) {
      throw new BadRequestError('Invalid question id.');
    }

    const quiz = await this.quizRepository.findById(quizId);
    if (!quiz) {
      throw new NotFoundError('Quiz not found.');
    }

    const questionExists = quiz.questions.some(
      (q) => q._id?.toString() === questionId,
    );
    if (!questionExists) {
      throw new NotFoundError('Question not found in this quiz.');
    }

    if (quiz.questions.length <= 1) {
      throw new BadRequestError(
        'Cannot delete the last question. A quiz must have at least 1 question.',
      );
    }

    return this.quizRepository.deleteQuestion(quizId, questionId);
  }
}
