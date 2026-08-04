import { Injectable } from '@nestjs/common';
import fs from 'fs';
import path from 'path';
import { BadRequestError } from '../../../../common/custom-error';
import { saveUploadedFile } from '../../../../configs/upload';
import { CourseManagementActor } from '../../../course/application/policies/course-management.policy';
import { InstructorLessonAccessResolver } from './instructor-lesson-access.resolver';

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/zip',
  'application/x-zip-compressed',
]);

const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.jpeg',
  '.jpg',
  '.png',
  '.webp',
  '.txt',
  '.doc',
  '.docx',
  '.zip',
]);

const DISALLOWED_EXTENSIONS = new Set([
  '.html',
  '.htm',
  '.xhtml',
  '.js',
  '.mjs',
  '.sh',
  '.exe',
  '.bat',
  '.cmd',
  '.ps1',
  '.svg',
  '.php',
  '.asp',
  '.jsp',
]);

@Injectable()
export class UploadInstructorLessonAttachmentService {
  constructor(private readonly resolver: InstructorLessonAccessResolver) {}

  async execute(
    actor: CourseManagementActor,
    lessonId: string,
    file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestError('No attachment file provided in FormData.');
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestError('Attachment file size must not exceed 10 MB.');
    }

    // Sanitize and validate filename against path traversal attacks
    const rawOriginalName = file.originalname || 'attachment';
    if (/[/\\]/.test(rawOriginalName) || /\.\.[/\\]?/.test(rawOriginalName)) {
      throw new BadRequestError('Invalid file name (path traversal or separator detected).');
    }

    const sanitizedOriginalName = path.basename(rawOriginalName);
    const ext = path.extname(sanitizedOriginalName).toLowerCase();

    if (DISALLOWED_EXTENSIONS.has(ext) || !ALLOWED_EXTENSIONS.has(ext)) {
      throw new BadRequestError(`File extension '${ext}' is not supported for attachments.`);
    }

    const mimeType = (file.mimetype || '').toLowerCase();
    if (mimeType === 'text/html' || mimeType === 'application/xhtml+xml' || mimeType === 'image/svg+xml') {
      throw new BadRequestError(`MIME type '${mimeType}' is explicitly disallowed.`);
    }

    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new BadRequestError(`MIME type '${mimeType}' is not supported for attachments.`);
    }

    // 1. Authorize FIRST before writing file to disk
    const { lesson } = await this.resolver.assertCanAuthorLesson(actor, lessonId);

    // 2. Save uploaded file to disk after authorization check passes
    const fileUrl = await saveUploadedFile(file, 'attachments');

    // 3. Update database with saved attachment URL and perform cleanup if DB update fails
    try {
      if (!Array.isArray(lesson.attachments)) {
        lesson.attachments = [];
      }
      lesson.attachments.push(fileUrl);
      lesson.attachmentUrl = fileUrl; // legacy compat
      await lesson.save();

      // Ensure no absolute filesystem path is leaked in response
      const cleanLessonObj = lesson.toObject ? lesson.toObject() : lesson;
      if (cleanLessonObj.attachments) {
        cleanLessonObj.attachments = cleanLessonObj.attachments.map((att: string) =>
          att.replace(/\\/g, '/'),
        );
      }
      return cleanLessonObj;
    } catch (dbErr) {
      // Perform cleanup on saved file if DB update fails
      this.cleanupFile(fileUrl);
      throw dbErr;
    }
  }

  private cleanupFile(fileUrl: string) {
    try {
      if (fileUrl.startsWith('/uploads/')) {
        const absolutePath = path.join(process.cwd(), fileUrl);
        if (fs.existsSync(absolutePath)) {
          fs.unlinkSync(absolutePath);
        }
      }
    } catch {
      // Ignore cleanup error in fallback
    }
  }
}
