import { Inject, Injectable } from '@nestjs/common';
import { DomainError, ErrorCode } from '../../../../shared/errors/error-codes';
import { IQuizAttemptRepository, QUIZ_ATTEMPT_REPOSITORY } from '../../domain/interfaces/quiz-attempt.repository';
import { buildQuizReviewQuestions, QuizAttempt } from '../../domain/entities/quiz-attempt.entity';
import { QuizSession } from '../../infrastructure/persistence/schemas/quiz-session.schema';

/**
 * UC42: View Quiz Result (Student)
 * Service to fetch detail of a specific quiz attempt by a student.
 */
@Injectable()
export class GetAttemptService {
  constructor(
    @Inject(QUIZ_ATTEMPT_REPOSITORY)
    private readonly quizAttemptRepository: IQuizAttemptRepository,
  ) {}

  async execute(userId: string, attemptId: string): Promise<QuizAttempt> {
    const attempt = await this.quizAttemptRepository.findByIdAndUser(attemptId, userId);
    if (!attempt) {
      throw DomainError.notFound(ErrorCode.QUIZ_NOT_FOUND, 'Quiz attempt not found.');
    }
    const props = attempt.toProps();
    if (props.reviewQuestions?.length || !props.sessionId) return attempt;

    // Attempts created before reviewQuestions existed can still be reviewed
    // from their own session snapshot. We never query the mutable question
    // bank here, so replacing a library cannot alter history.
    const session = await QuizSession.findOne({ _id: props.sessionId, userId })
      .select('+questions.correctAnswerIndex +questions.explanation')
      .lean()
      .exec();
    if (!session?.questions?.length) return attempt;

    return QuizAttempt.fromPersistence(
      {
        ...props,
        reviewQuestions: buildQuizReviewQuestions(
          session.questions.map((question: any) => ({
            id: String(question.sourceQuestionId),
            questionText: question.questionText,
            options: question.options.map((option: any) => ({ optionId: String(option.optionId), text: String(option.text) })),
            correctAnswerIndex: question.correctAnswerIndex,
            explanation: question.explanation,
          })),
          props.answers,
        ),
      },
      attempt.id,
    );
  }
}
