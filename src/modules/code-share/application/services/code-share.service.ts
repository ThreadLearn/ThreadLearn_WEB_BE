import { Inject, Injectable } from '@nestjs/common';
import mongoose from 'mongoose';
import { BadRequestError, ConflictError, NotFoundError } from '../../../../common/custom-error';
import { LEARNING_ACCESS, ILearningAccess } from '../../../../shared/domain/interfaces/learning-access.port';
import { CodeExecution } from '../../../code-execution/models/code-execution.model';
import { Lesson } from '../../../lessons/models/lesson.model';
import { CodeShare } from '../../models/code-share.model';
import { CreateCodeShareDto } from '../dto/code-share.dto';
import { Comment } from '../../../comment/models/comment.model';
import type { UserRole } from '../../../auth/domain/value-objects/user-role.vo';

@Injectable()
export class CodeShareService {
  constructor(@Inject(LEARNING_ACCESS) private readonly learningAccess: ILearningAccess) {}

  async createFromExecution(userId: string, role: UserRole, dto: CreateCodeShareDto) {
    const execution = await CodeExecution.findOne({ _id: dto.sourceExecutionId, userId }).lean();
    if (!execution) throw new NotFoundError('Code execution not found.');

    const context = await this.assertTargetAccess(userId, role, dto.targetType, dto.targetId);
    const executionLessonId = execution.lessonId ? String(execution.lessonId) : undefined;
    const executionCourseId = execution.courseId ? String(execution.courseId) : undefined;
    const executionLesson = executionLessonId
      ? await Lesson.findById(executionLessonId).select('courseId title currentVersionId updatedAt').lean()
      : null;
    if (dto.targetType === 'LESSON' && executionLessonId !== dto.targetId) {
      throw new BadRequestError('Code execution does not belong to this lesson.');
    }
    if (dto.targetType === 'COURSE' && !executionLessonId) {
      throw new BadRequestError('Course discussions can only share code linked to a lesson.');
    }
    if (dto.targetType === 'COURSE') {
      if (!executionLesson || String(executionLesson.courseId) !== dto.targetId || executionCourseId !== dto.targetId) {
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
        lessonVersionId: executionLesson?.currentVersionId,
        lessonUpdatedAt: executionLesson?.updatedAt,
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
        const existing = await CodeShare.findOne({
          sourceExecutionId: dto.sourceExecutionId,
          targetType: dto.targetType,
          targetId: dto.targetId,
        }).lean();
        if (existing && String(existing.authorId) === userId) return this.present(existing);
        throw new ConflictError('This execution is already shared.');
      }
      throw error;
    }
  }

  async getVisible(userId: string, role: UserRole, id: string) {
    if (!mongoose.isValidObjectId(id)) throw new BadRequestError('Invalid code share id.');
    const share = await CodeShare.findById(id)
      .populate('authorId', 'firstName lastName avatarUrl')
      .populate('lessonId', 'title courseId currentVersionId updatedAt')
      .lean();
    if (!share) throw new NotFoundError('Code share not found.');
    await this.assertTargetAccess(userId, role, share.targetType, String(share.targetId));
    const authorId = typeof share.authorId === 'object' ? String(share.authorId._id) : String(share.authorId);
    if (authorId !== userId && role !== 'ADMIN') {
      const isActivelyLinked = await Comment.exists({ codeShareId: share._id, status: 'active' });
      if (!isActivelyLinked) throw new NotFoundError('Code share not found.');
    }
    const hasAttempt = authorId === userId || !share.lessonId || await CodeExecution.exists({
      userId,
      lessonId: typeof share.lessonId === 'object' ? share.lessonId._id : share.lessonId,
      ...(share.exerciseId ? { exerciseId: share.exerciseId } : {}),
    });
    return this.present(share, { revealCode: Boolean(hasAttempt) });
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

  private present(share: any, options: { revealCode?: boolean } = {}) {
    const author = share.authorId;
    const lesson = share.lessonId;
    const hasLessonDetails = lesson && typeof lesson === 'object' && lesson.title !== undefined;
    const revealCode = options.revealCode ?? true;
    return {
      _id: String(share._id),
      authorId: typeof author === 'object' ? String(author._id) : String(author),
      author: author && typeof author === 'object' && author.firstName !== undefined
        ? { _id: String(author._id), name: `${author.firstName ?? ''} ${author.lastName ?? ''}`.trim() || 'ThreadLearn member', avatarUrl: author.avatarUrl ?? null }
        : undefined,
      targetType: share.targetType,
      targetId: String(share.targetId),
      courseId: share.courseId ? String(share.courseId) : undefined,
      lessonId: share.lessonId ? String(typeof lesson === 'object' ? lesson._id : lesson) : undefined,
      exerciseId: share.exerciseId,
      lessonVersionId: share.lessonVersionId ? String(share.lessonVersionId) : undefined,
      lesson: hasLessonDetails ? {
        _id: String(lesson._id),
        title: String(lesson.title),
        courseId: String(lesson.courseId),
      } : undefined,
      isOutdated: Boolean(hasLessonDetails && share.lessonVersionId && String(lesson.currentVersionId ?? '') !== String(share.lessonVersionId)),
      isCodeLocked: !revealCode,
      language: share.language,
      sourceCode: revealCode ? share.sourceCode : undefined,
      status: share.status,
      stdout: revealCode ? share.stdout ?? '' : '',
      stderr: revealCode ? share.stderr ?? '' : '',
      compileOutput: revealCode ? share.compileOutput ?? '' : '',
      outputTruncated: Boolean(share.outputTruncated),
      runtime: share.runtime ?? '0.000',
      memory: share.memory ?? 0,
      visibility: share.visibility,
      createdAt: share.createdAt,
    };
  }
}
