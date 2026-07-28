import { ICertificate } from '../models/certificate.model';

export type CertificateValidity = 'valid' | 'expired';

export interface CertificateCourseResponse {
  id: string;
  title: string;
  slug: string;
  level: string;
  language: string;
  description: string;
  tags: string[];
  category: string;
  estimatedDuration: number | null;
  totalLessons: number | null;
}

export interface CertificateResponse {
  id: string;
  certificateCode: string;
  recipientName: string;
  course: CertificateCourseResponse;
  issuedAt: Date;
  completedAt: Date;
  expiresAt: Date | null;
  status: CertificateValidity;
  templateVersion: string;
  verificationPath: string;
  verificationUrl: string;
  pdfPath: string;
}

type PopulatedReference = {
  _id?: unknown;
  id?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  title?: unknown;
  slug?: unknown;
  level?: unknown;
  language?: unknown;
  shortDescription?: unknown;
  description?: unknown;
  tags?: unknown;
  category?: unknown;
  estimatedDuration?: unknown;
  totalLessons?: unknown;
};

type CertificateSource = Partial<ICertificate> & {
  _id?: unknown;
  userId?: unknown;
  courseId?: unknown;
};

const stringValue = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim();

const referenceValue = (value: unknown): PopulatedReference =>
  value && typeof value === 'object' ? (value as PopulatedReference) : {};

const referenceId = (value: unknown): string => {
  const reference = referenceValue(value);
  return stringValue(reference._id ?? reference.id ?? value);
};

const dateValue = (value: unknown, fallback: Date): Date => {
  const date = value instanceof Date ? value : new Date(String(value ?? ''));
  return Number.isNaN(date.getTime()) ? fallback : date;
};

function frontendBaseUrl(): string {
  const configured = (process.env.FRONTEND_URL ?? '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  const isLocalOrigin = (origin: string) =>
    /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(origin);

  if (process.env.NODE_ENV === 'production') {
    const publicOrigin = configured.find((origin) => !isLocalOrigin(origin));
    if (!publicOrigin) {
      throw new Error(
        'FRONTEND_URL must contain the deployed frontend origin in production.',
      );
    }
    return publicOrigin;
  }

  return configured[0] || 'http://localhost:3001';
}

export class CertificatePresenter {
  static toResponse(certificate: CertificateSource, now = new Date()): CertificateResponse {
    const code = stringValue(certificate.certificateCode);
    const user = referenceValue(certificate.userId);
    const course = referenceValue(certificate.courseId);
    const tagsSource = certificate.courseTags ?? course.tags;
    const tags = Array.isArray(tagsSource)
      ? tagsSource.map(stringValue).filter(Boolean).slice(0, 8)
      : [];
    const issuedAt = dateValue(certificate.issuedAt, now);
    const completedAt = dateValue(certificate.completedAt, issuedAt);
    const expiresAt = certificate.expiresAt
      ? dateValue(certificate.expiresAt, issuedAt)
      : null;
    const recipientName =
      stringValue(certificate.recipientName) ||
      [stringValue(user.firstName), stringValue(user.lastName)].filter(Boolean).join(' ');
    const verificationPath = `/api/v1/certificates/verify/${encodeURIComponent(code)}`;

    return {
      id: referenceId(certificate._id),
      certificateCode: code,
      recipientName,
      course: {
        id: referenceId(certificate.courseId),
        title: stringValue(certificate.courseTitle) || stringValue(course.title),
        slug: stringValue(certificate.courseSlug) || stringValue(course.slug),
        level: stringValue(certificate.courseLevel) || stringValue(course.level),
        language:
          stringValue(certificate.courseLanguage) || stringValue(course.language),
        description:
          stringValue(certificate.courseDescription) ||
          stringValue(course.shortDescription) ||
          stringValue(course.description),
        tags,
        category:
          stringValue(certificate.courseCategory) || stringValue(course.category),
        estimatedDuration:
          typeof certificate.courseEstimatedDuration === 'number'
            ? certificate.courseEstimatedDuration
            : typeof course.estimatedDuration === 'number'
              ? course.estimatedDuration
              : null,
        totalLessons:
          typeof certificate.courseTotalLessons === 'number'
            ? certificate.courseTotalLessons
            : typeof course.totalLessons === 'number'
              ? course.totalLessons
              : null,
      },
      issuedAt,
      completedAt,
      expiresAt,
      status: expiresAt && expiresAt.getTime() <= now.getTime() ? 'expired' : 'valid',
      templateVersion: stringValue(certificate.templateVersion) || 'forest-v1',
      verificationPath,
      verificationUrl: `${frontendBaseUrl()}/certificates/verify/${encodeURIComponent(code)}`,
      pdfPath: `/api/v1/certificates/${encodeURIComponent(code)}/pdf`,
    };
  }

  static toList(certificates: CertificateSource[], now = new Date()): CertificateResponse[] {
    return certificates.map((certificate) => this.toResponse(certificate, now));
  }
}
