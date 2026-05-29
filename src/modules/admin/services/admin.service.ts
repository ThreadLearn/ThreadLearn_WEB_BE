import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User } from '../../auth/models/user.model';
import { EmailService } from '../../auth/services/email.service';
import { Course } from '../../courses/models/course.model';
import { UserStats } from '../../gamification/models/user-stats.model';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../common/custom-error';

type CreateStudentData = {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
};

type ListStudentsQuery = {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
  isVerified?: boolean;
};

type UpdateStudentData = {
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  isVerified?: boolean;
};

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

  static async ensureActiveAdmin(adminId: string) {
    const admin = await User.findById(adminId);
    if (!admin) {
      throw new ForbiddenError('Admin account not found.');
    }

    if (admin.role !== 'ADMIN') {
      throw new ForbiddenError('You do not have permission to manage students.');
    }

    if (admin.isActive === false || admin.lockedAt) {
      throw new ForbiddenError('Admin account is inactive or locked.');
    }
  }

  static async createStudent(data: CreateStudentData) {
    const existing = await User.findOne({ email: data.email });
    if (existing) {
      throw new BadRequestError('Email address is already in use.');
    }

    const generatedPassword = data.password ? null : this.generateTemporaryPassword();
    const password = data.password || generatedPassword;
    const passwordHash = await bcrypt.hash(password as string, 10);
    const verifiedAt = new Date();

    const user = await User.create({
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      role: 'STUDENT',
      isActive: true,
      isVerified: true,
      emailVerifiedAt: verifiedAt,
    });

    await UserStats.create({
      userId: user._id,
      xp: 0,
      level: 1,
    });

    if (generatedPassword) {
      await EmailService.sendStudentInvitationEmail({
        email: user.email,
        firstName: user.firstName,
        temporaryPassword: generatedPassword,
      });
    }

    return {
      student: this.toSafeStudent(user),
      temporaryPasswordSent: Boolean(generatedPassword),
    };
  }

  static async listStudents(query: ListStudentsQuery) {
    const filter: any = { role: 'STUDENT' };
    if (query.isActive !== undefined) filter.isActive = query.isActive;
    if (query.isVerified !== undefined) filter.isVerified = query.isVerified;

    if (query.search) {
      const searchRegex = new RegExp(this.escapeRegex(query.search), 'i');
      filter.$or = [{ email: searchRegex }, { firstName: searchRegex }, { lastName: searchRegex }];
    }

    const skip = (query.page - 1) * query.limit;
    const [students, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit),
      User.countDocuments(filter),
    ]);

    return {
      items: students.map((student) => this.toSafeStudent(student)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  static async updateStudent(studentId: string, data: UpdateStudentData) {
    const student = await this.getStudentOrThrow(studentId);

    if (data.firstName !== undefined) student.firstName = data.firstName;
    if (data.lastName !== undefined) student.lastName = data.lastName;
    if (data.avatarUrl !== undefined) student.avatarUrl = data.avatarUrl;
    if (data.isVerified !== undefined) {
      student.isVerified = data.isVerified;
      student.emailVerifiedAt = data.isVerified ? student.emailVerifiedAt || new Date() : undefined;
    }

    await student.save();
    return this.toSafeStudent(student);
  }

  static async lockStudent(studentId: string, lockedReason?: string) {
    const student = await this.getStudentOrThrow(studentId);
    student.isActive = false;
    student.lockedAt = new Date();
    student.lockedReason = lockedReason;
    await student.save();
    return this.toSafeStudent(student);
  }

  static async unlockStudent(studentId: string) {
    const student = await this.getStudentOrThrow(studentId);
    student.isActive = true;
    student.lockedAt = undefined;
    student.lockedReason = undefined;
    await student.save();
    return this.toSafeStudent(student);
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

  private static async getStudentOrThrow(studentId: string) {
    const student = await User.findById(studentId);
    if (!student) {
      throw new NotFoundError('Student not found.');
    }

    if (student.role !== 'STUDENT') {
      throw new BadRequestError('Target user is not a student.');
    }

    return student;
  }

  private static generateTemporaryPassword() {
    return crypto.randomBytes(12).toString('base64url');
  }

  private static escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private static toSafeStudent(user: any) {
    return {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      avatarUrl: user.avatarUrl,
      isActive: user.isActive,
      isVerified: user.isVerified,
      emailVerifiedAt: user.emailVerifiedAt,
      lockedAt: user.lockedAt,
      lockedReason: user.lockedReason,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
export default AdminService;
