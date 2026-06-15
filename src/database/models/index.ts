import { Course } from '../../modules/courses/models/course.model';
import { Lesson } from '../../modules/lessons/models/lesson.model';
import { Enrollment } from '../../modules/enrollments/models/enrollment.model';
import { QuizAttempt } from '../../modules/quiz-attempts/models/quiz-attempt.model';
import { AIHistory } from '../../modules/ai/models/ai-history.model';
import { UserStats } from '../../modules/gamification/models/user-stats.model';
import { Notification } from '../../modules/notifications/models/notification.model';

// NOTE: Đã chuyển sang @nestjs/mongoose — không re-export ở aggregator.
//   - Quiz                  → src/modules/quiz/schemas/quiz.schema.ts
//   - User, RefreshToken    → src/modules/auth/schemas/{user,refresh-token}.schema.ts
// Các caller dùng qua @InjectModel(<Name>.name).

export {
  Course,
  Lesson,
  Enrollment,
  QuizAttempt,
  AIHistory,
  UserStats,
  Notification,
};
