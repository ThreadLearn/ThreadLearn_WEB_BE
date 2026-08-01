import { Quiz } from '../../domain/entities/quiz.entity';
import { Question } from '../../domain/entities/question.entity';

/**
 * QuizMapper — cầu doc ↔ entity.
 * Nơi DUY NHẤT biết field legacy (passingScore ↔ passingScorePercent, timeLimit ↔ timeLimitSeconds).
 */
export class QuizMapper {
  static toEntity(doc: any): Quiz {
    const questions = (doc.questions ?? []).map((q: any) =>
      Question.fromPersistence(
        {
          questionText: q.questionText,
          options: q.options,
          correctAnswerIndex: q.correctAnswerIndex,
        },
        String(q._id),
      ),
    );

    return Quiz.fromPersistence(
      {
        title: doc.title,
        description: doc.description,
        lessonId: String(doc.lessonId),
        passingScorePercent: doc.passingScorePercent ?? doc.passingScore ?? 80,
        xpReward: doc.xpReward ?? 100,
        timeLimitSeconds: doc.timeLimitSeconds ?? doc.timeLimit,
        useQuestionBank: doc.useQuestionBank === true,
        randomQuestionCount: doc.randomQuestionCount,
        questions,
        isDeleted: doc.isDeleted === true,
        deletedAt: doc.deletedAt,
      },
      String(doc._id),
    );
  }

  static toPersistence(entity: Quiz): Record<string, any> {
    const p = entity.toProps();
    return {
      title: p.title,
      description: p.description,
      lessonId: p.lessonId,
      passingScorePercent: p.passingScorePercent,
      xpReward: p.xpReward,
      timeLimitSeconds: p.timeLimitSeconds,
      useQuestionBank: p.useQuestionBank === true,
      randomQuestionCount: p.randomQuestionCount,
      // ── legacy mirror fields ──
      passingScore: p.passingScorePercent,
      timeLimit: p.timeLimitSeconds ?? 1800,
      isDeleted: p.isDeleted === true,
      deletedAt: p.deletedAt ?? null,
      // ── questions ──
      questions: p.questions.map((q) => {
        const qp = q.toProps();
        // BaseEntity sinh id mặc định là timestamp string (13 số).
        // Mongoose cần 24 hex string cho ObjectId. 
        // Nếu id không phải ObjectId hợp lệ, ta bỏ qua (_id: undefined) để Mongoose tự sinh.
        const isValidObjectId = qp.id && /^[0-9a-fA-F]{24}$/.test(qp.id);
        
        return {
          _id: isValidObjectId ? qp.id : undefined,
          questionText: qp.questionText,
          options: qp.options,
          correctAnswerIndex: qp.correctAnswerIndex,
        };
      }),
    };
  }
}
