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
        questions,
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
      // ── legacy mirror fields ──
      passingScore: p.passingScorePercent,
      timeLimit: p.timeLimitSeconds ?? 1800,
      // ── questions ──
      questions: p.questions.map((q) => {
        const qp = q.toProps();
        return {
          _id: qp.id || undefined,
          questionText: qp.questionText,
          options: qp.options,
          correctAnswerIndex: qp.correctAnswerIndex,
        };
      }),
    };
  }
}
