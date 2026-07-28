import crypto from 'crypto';
import mongoose from 'mongoose';
import { ForbiddenError, NotFoundError } from '../../../common/custom-error';
import { User } from '../../auth/models/user.model';
import { Course } from '../../courses/models/course.model';
import { Enrollment } from '../../enrollments/models/enrollment.model';
import { Certificate } from '../models/certificate.model';
import {
  CertificatePresenter,
  CertificateResponse,
} from '../presentation/certificate.presenter';
import { CertificatePdfService } from './certificate-pdf.service';

const TEMPLATE_VERSION = 'forest-v1';

type MongoDuplicateKeyError = Error & {
  code?: number;
};

export class CertificatesService {
  static async issueCertificate(userId: string, courseId: string) {
    if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(courseId)) {
      throw new ForbiddenError(
        'A completed enrollment is required before a certificate can be issued.',
        'CERTIFICATE_NOT_ELIGIBLE',
      );
    }

    const enrollment = await Enrollment.findOne({
      userId,
      courseId,
      completed: true,
    })
      .select('completedAt updatedAt')
      .lean();
    if (!enrollment) {
      throw new ForbiddenError(
        'A completed enrollment is required before a certificate can be issued.',
        'CERTIFICATE_NOT_ELIGIBLE',
      );
    }

    const [user, course] = await Promise.all([
      User.findById(userId).select('firstName lastName').lean(),
      Course.findById(courseId)
        .select(
          'title slug level language shortDescription description tags category estimatedDuration totalLessons',
        )
        .lean(),
    ]);
    if (!user || !course) {
      throw new NotFoundError('Certificate recipient or course not found.');
    }

    const issuedAt = new Date();
    const certificateCode = crypto.randomUUID();
    const recipientName = [user.firstName, user.lastName]
      .map((part) => String(part ?? '').trim())
      .filter(Boolean)
      .join(' ');
    const insert = {
      userId,
      courseId,
      certificateCode,
      recipientName,
      courseTitle: String(course.title),
      courseSlug: String(course.slug),
      courseLevel: String(course.level),
      courseLanguage: String(course.language),
      courseDescription: String(course.shortDescription || course.description || '').trim(),
      courseTags: Array.isArray(course.tags)
        ? course.tags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 8)
        : [],
      courseCategory: String(course.category || '').trim() || undefined,
      courseEstimatedDuration:
        typeof course.estimatedDuration === 'number' ? course.estimatedDuration : undefined,
      courseTotalLessons:
        typeof course.totalLessons === 'number' ? course.totalLessons : undefined,
      completedAt: enrollment.completedAt ?? enrollment.updatedAt ?? issuedAt,
      templateVersion: TEMPLATE_VERSION,
      issuedAt,
      pdfUrl: `/api/v1/certificates/${certificateCode}/pdf`,
    };

    try {
      return await Certificate.findOneAndUpdate(
        { userId, courseId },
        { $setOnInsert: insert },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    } catch (error) {
      if ((error as MongoDuplicateKeyError)?.code !== 11000) throw error;

      const winner = await Certificate.findOne({ userId, courseId });
      if (winner) return winner;
      throw error;
    }
  }

  static async listMine(userId: string): Promise<CertificateResponse[]> {
    const certificates = await Certificate.find({ userId })
      .populate('userId', 'firstName lastName')
      .populate(
        'courseId',
        'title slug thumbnailUrl level language shortDescription description tags category estimatedDuration totalLessons',
      )
      .sort({ issuedAt: -1 });
    return CertificatePresenter.toList(certificates);
  }

  static async verify(code: string): Promise<CertificateResponse> {
    const certificate = await Certificate.findOne({ certificateCode: code })
      .populate(
        'courseId',
        'title slug level language shortDescription description tags category estimatedDuration totalLessons',
      )
      .populate('userId', 'firstName lastName');
    if (!certificate) throw new NotFoundError('Certificate not found.');
    return CertificatePresenter.toResponse(certificate);
  }

  static async renderPdf(code: string): Promise<{
    buffer: Buffer;
    filename: string;
  }> {
    const certificate = await this.verify(code);
    const filenameSlug =
      certificate.course.slug.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') ||
      'course';
    return {
      buffer: await CertificatePdfService.render(certificate),
      filename: `threadlearn-${filenameSlug}-${certificate.certificateCode}.pdf`,
    };
  }
}

export default CertificatesService;
