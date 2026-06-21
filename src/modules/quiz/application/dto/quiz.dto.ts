/**
 * DTO types cho application layer — quiz module.
 * Application services import từ đây, KHÔNG import từ presentation/validators.
 */

export interface CreateQuizInput {
  lessonId: string;
  title: string;
  description?: string;
  passingScorePercent?: number;
  timeLimitSeconds?: number;
  xpReward?: number;
  questions: QuestionInput[];
}

export interface UpdateQuizInput {
  title?: string;
  description?: string;
  passingScorePercent?: number;
  timeLimitSeconds?: number;
  xpReward?: number;
}

export interface QuestionInput {
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
}

export interface UpdateQuestionInput {
  questionText?: string;
  options?: string[];
  correctAnswerIndex?: number;
}
