export interface GradingResult {
  score: number;
  passed: boolean;
  isTimeout: boolean;
}

/**
 * Hợp đồng tối thiểu mà domain-service cần để chấm điểm.
 * Dùng structural typing để KHÔNG phụ thuộc cứng vào entity Question của module quiz
 * (Question của quiz thoả mãn interface này qua getter id + correctAnswerIndex).
 */
export interface GradableQuestion {
  id: string;
  correctAnswerIndex: number;
}

export class QuizGradingService {
  grade(
    questions: GradableQuestion[],
    answers: Record<string, number>,
    passingThreshold: number,
    startTime?: string,
    timeLimitSeconds?: number,
  ): GradingResult {
    let correctCount = 0;

    questions.forEach((question, index) => {
      const questionId = question.id?.toString();
      const userAnswer =
        (questionId ? answers[questionId] : undefined) ??
        answers[index.toString()];
      if (userAnswer === question.correctAnswerIndex) {
        correctCount++;
      }
    });

    const now = new Date();
    let score = Math.round((correctCount / questions.length) * 100);
    let isTimeout = false;

    if (startTime && timeLimitSeconds !== undefined) {
      const startedAt = new Date(startTime);
      const elapsedSeconds = (now.getTime() - startedAt.getTime()) / 1000;

      // Allow 15 seconds buffer for network latency
      if (elapsedSeconds > timeLimitSeconds + 15) {
        isTimeout = true;
        score = 0; // automatically fail the quiz with 0 score
      }
    }

    const passed = !isTimeout && score >= passingThreshold;

    return {
      score,
      passed,
      isTimeout,
    };
  }
}

