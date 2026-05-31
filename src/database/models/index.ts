// Mongoose model barrel — imported by any tooling that needs the schemas
// at side-effect time (seed scripts, migrations).
import { User } from '../../modules/auth/models/user.model';
import { RefreshToken } from '../../modules/auth/models/refresh-token.model';
import { Course } from '../../modules/courses/models/course.model';
import { Lesson } from '../../modules/lessons/models/lesson.model';
import { Enrollment } from '../../modules/enrollments/models/enrollment.model';
import { Quiz } from '../../modules/quiz/models/quiz.model';
import { QuizAttempt } from '../../modules/quiz-attempts/models/quiz-attempt.model';
import { UserStats } from '../../modules/gamification/models/user-stats.model';
import { Notification } from '../../modules/notifications/models/notification.model';
import { Comment } from '../../modules/comment/models/comment.model';
import { Bookmark } from '../../modules/bookmark/models/bookmark.model';
import { Note } from '../../modules/note/models/note.model';
import { Exercise } from '../../modules/code-execution/models/exercise.model';
import { CodeExecution } from '../../modules/code-execution/models/code-execution.model';
import { AIAnalysis } from '../../modules/ai-analysis/models/ai-analysis.model';

export {
  User, RefreshToken,
  Course, Lesson, Enrollment,
  Quiz, QuizAttempt,
  UserStats, Notification,
  Comment, Bookmark, Note,
  Exercise, CodeExecution, AIAnalysis,
};
