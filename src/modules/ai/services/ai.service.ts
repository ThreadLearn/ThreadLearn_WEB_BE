import { AIHistory } from '../models/ai-history.model';
import { User } from '../../auth/models/user.model';
import { Course } from '../../courses/models/course.model';
import { NotFoundError } from '../../../common/custom-error';

export class AIService {
  static async requestRecommendation(userId: string, courseId: string) {
    const [user, course] = await Promise.all([
      User.findById(userId),
      Course.findById(courseId),
    ]);

    if (!user) throw new NotFoundError('User profile not found.');
    if (!course) throw new NotFoundError('Course profile not found.');

    const prompt = `Generate a personalized learning recommendations roadmap for student ${user.firstName} ${user.lastName} taking the course "${course.title}".`;
    
    const mockResponse = `### Personalized Study Recommendation for "${course.title}"

Hello ${user.firstName}, based on your profile, here is your customized learning path:
1. **Prerequisites & Core Concepts**: Prioritize reading the first two lessons on syntax conventions.
2. **Interactive Exercises**: Try completing the quiz attempts for Lesson 1, aiming for a >90% mark to reinforce retention.
3. **Weekly Goal**: Complete 2 sequential lessons, maintaining a study streak to gain extra XP.

*Good luck with your journey!*`;

    const historyRecord = await AIHistory.create({
      userId,
      prompt,
      response: mockResponse,
      category: 'recommendation',
    });

    return historyRecord;
  }

  static async getHistoryLogs(userId: string) {
    return await AIHistory.find({ userId }).sort({ createdAt: -1 });
  }
}
export default AIService;
