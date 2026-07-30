import { Inject, Injectable } from '@nestjs/common';
import mongoose from 'mongoose';
import { BadRequestError, ConflictError, NotFoundError } from '../../../../common/custom-error';
import { LEARNING_ACCESS, ILearningAccess } from '../../../../shared/domain/interfaces/learning-access.port';
import { CodeExecution } from '../../../code-execution/models/code-execution.model';
import { Lesson } from '../../../lessons/models/lesson.model';
import { CodeShare } from '../../models/code-share.model';
import { CreateCodeShareDto } from '../dto/code-share.dto';

type UserRole = 'STUDENT' | 'ADMIN';

@Injectable()
export class CodeShareService {
  constructor(@Inject(LEARNING_ACCESS) private readonly learningAccess: ILearningAccess) {}

  async createFromExecution(userId: string, role: UserRole, dto: CreateCodeShareDto) {
    const execution = await CodeExecution.findOne({ _id: dto.sourceExecutionId, userId }).lean();
    if (!execution) throw new NotFoundError('Code execution not found.');

    const context = await this.assertTargetAccess(userId, role, dto.targetType, dto.targetId);
    const executionLessonId = execution.lessonId ? String(execution.lessonId) : undefined;
    const executionCourseId = execution.courseId ? String(execution.courseId) : undefined;
    if (dto.targetType === 'LESSON' && executionLessonId !== dto.targetId) {
      throw new BadRequestError('Code execution does not belong to this lesson.');
    }
    if (dto.targetType === 'COURSE' && !executionLessonId) {
      throw new BadRequestError('Course discussions can only share code linked to a lesson.');
    }
    if (dto.targetType === 'COURSE') {
      const lesson = await Lesson.findById(executionLessonId).select('courseId').lean();
      if (!lesson || String(lesson.courseId) !== dto.targetId || executionCourseId !== dto.targetId) {
        throw new BadRequestError('Code execution does not belong to this course.');
      }
    }

    try {
      const created = await CodeShare.create({
        authorId: userId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        courseId: executionCourseId ?? context.courseId,
        lessonId: executionLessonId,
        exerciseId: execution.exerciseId,
        sourceExecutionId: execution._id,
        language: execution.language,
        sourceCode: execution.sourceCode,
        status: execution.status,
        stdout: execution.stdout,
        stderr: execution.stderr,
        compileOutput: execution.compileOutput,
        outputTruncated: execution.outputTruncated,
        runtime: execution.runtime,
        memory: execution.memory,
        visibility: dto.visibility,
      });
      return this.present(created.toObject());
    } catch (error: any) {
      if (error?.code === 11000) {
        const existing = await CodeShare.findOne({ sourceExecutionId: dto.sourceExecutionId }).lean();
        if (existing && String(existing.authorId) === userId) return this.present(existing);
        throw new ConflictError('This execution is already shared.');
      }
      throw error;
    }
  }

  async getVisible(userId: string, role: UserRole, id: string) {
    if (!mongoose.isValidObjectId(id)) throw new BadRequestError('Invalid code share id.');
    const share = await CodeShare.findById(id).populate('authorId', 'firstName lastName avatarUrl').lean();
    if (!share) throw new NotFoundError('Code share not found.');
    await this.assertTargetAccess(userId, role, share.targetType, String(share.targetId));
    return this.present(share);
  }

  async assertAttachable(userId: string, role: UserRole, id: string, targetType: 'COURSE' | 'LESSON', targetId: string) {
    const share = await this.getVisible(userId, role, id);
    if (share.authorId !== userId || share.targetType !== targetType || share.targetId !== targetId) {
      throw new BadRequestError('Code share does not match this discussion.');
    }
    return share;
  }

  private async assertTargetAccess(userId: string, role: UserRole, targetType: 'COURSE' | 'LESSON', targetId: string): Promise<{ courseId?: string }> {
    if (!mongoose.isValidObjectId(targetId)) throw new BadRequestError('Invalid discussion target id.');
    if (targetType === 'COURSE') {
      await this.learningAccess.assertCourseInteractionAccess(targetId, { id: userId, role });
      return { courseId: targetId };
    }
    const lesson = await this.learningAccess.assertLessonInteractionAccess(targetId, { id: userId, role });
    return { courseId: String(lesson.courseId) };
  }

  private present(share: any) {
    const author = share.authorId;
    return {
      _id: String(share._id),
      authorId: typeof author === 'object' ? String(author._id) : String(author),
      author: author && typeof author === 'object' && author.firstName !== undefined
        ? { _id: String(author._id), name: `${author.firstName ?? ''} ${author.lastName ?? ''}`.trim() || 'ThreadLearn member', avatarUrl: author.avatarUrl ?? null }
        : undefined,
      targetType: share.targetType,
      targetId: String(share.targetId),
      courseId: share.courseId ? String(share.courseId) : undefined,
      lessonId: share.lessonId ? String(share.lessonId) : undefined,
      exerciseId: share.exerciseId,
      language: share.language,
      sourceCode: share.sourceCode,
      status: share.status,
      stdout: share.stdout ?? '',
      stderr: share.stderr ?? '',
      compileOutput: share.compileOutput ?? '',
      outputTruncated: Boolean(share.outputTruncated),
      runtime: share.runtime ?? '0.000',
      memory: share.memory ?? 0,
      visibility: share.visibility,
      createdAt: share.createdAt,
    };
  }
}
