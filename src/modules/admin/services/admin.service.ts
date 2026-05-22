import { User } from '../../auth/models/user.model';
import { Course } from '../../courses/models/course.model';
import { NotFoundError } from '../../../common/custom-error';

export class AdminService {
  /**
   * Lists all users with pagination. Admin only.
   */
  static async listUsers(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      User.find().select('-passwordHash').skip(skip).limit(limit).sort({ createdAt: -1 }),
      User.countDocuments(),
    ]);

    return { users, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Promotes a user to ADMIN role or demotes to STUDENT.
   */
  static async updateUserRole(userId: string, role: 'STUDENT' | 'ADMIN') {
    const user = await User.findByIdAndUpdate(userId, { role }, { new: true }).select('-passwordHash');
    if (!user) {
      throw new NotFoundError('User not found.');
    }
    return user;
  }

  /**
   * Toggles course published status.
   */
  static async toggleCoursePublish(courseId: string) {
    const course = await Course.findById(courseId);
    if (!course) {
      throw new NotFoundError('Course not found.');
    }
    course.isPublished = !course.isPublished;
    await course.save();
    return course;
  }

  /**
   * Hard deletes a user account by ID.
   */
  static async deleteUser(userId: string) {
    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      throw new NotFoundError('User not found.');
    }
    return true;
  }
}
export default AdminService;
