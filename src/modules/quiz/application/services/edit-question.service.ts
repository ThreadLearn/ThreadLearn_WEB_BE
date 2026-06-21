import { Inject, Injectable } from '@nestjs/common';
import { isValidObjectId } from 'mongoose';
import { BadRequestError, NotFoundError } from '../../../../common/custom-error';
import { UpdateQuestionDto } from '../../presentation/validators/quiz.validator';
import { IQuizRepository } from '../../domain/interfaces/quiz.repository';

@Injectable()
export class EditQuestionService {
  constructor(
    @Inject('IQuizRepository')
    private readonly quizRepository: IQuizRepository,
  ) {}

  async execute(quizId: string, questionId: string, dto: UpdateQuestionDto) {
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

    const question = quiz.questions.find(
      (q) => q._id?.toString() === questionId,
    );
    if (!question) {
      throw new NotFoundError('Question not found in this quiz.');
    }

    const finalOptions = dto.options ?? question.options;
    const finalIndex = dto.correctAnswerIndex ?? question.correctAnswerIndex;

    if (finalIndex >= finalOptions.length) {
      throw new BadRequestError(
        `correctAnswerIndex (${finalIndex}) must be less than options length (${finalOptions.length}).`,
      );
    }

    const setFields: Record<string, unknown> = {};
    if (dto.questionText !== undefined) {
      setFields['questions.$.questionText'] = dto.questionText;
    }
    if (dto.options !== undefined) {
      setFields['questions.$.options'] = dto.options;
    }
    if (dto.correctAnswerIndex !== undefined) {
      setFields['questions.$.correctAnswerIndex'] = dto.correctAnswerIndex;
    }

    return this.quizRepository.editQuestion(quizId, questionId, setFields);
  }
}
