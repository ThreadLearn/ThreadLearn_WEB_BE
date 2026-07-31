import {
  CertificatePresenter,
} from './certificate.presenter';

describe('CertificatePresenter', () => {
  const issuedAt = new Date('2026-07-21T08:00:00.000Z');
  const originalNodeEnv = process.env.NODE_ENV;
  const originalFrontendUrl = process.env.FRONTEND_URL;

  afterEach(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalFrontendUrl === undefined) delete process.env.FRONTEND_URL;
    else process.env.FRONTEND_URL = originalFrontendUrl;
  });

  it('returns a normalized public response without email or raw user identity', () => {
    const response = CertificatePresenter.toResponse(
      {
        _id: 'certificate-1',
        certificateCode: 'TL-CERT-001',
        recipientName: 'Phạm Ngọc Hoàng Anh',
        courseTitle: 'JavaScript Chuyên Sâu',
        courseSlug: 'javascript-chuyen-sau',
        courseLevel: 'ADVANCED',
        courseLanguage: 'javascript',
        completedAt: new Date('2026-07-20T08:00:00.000Z'),
        issuedAt,
        templateVersion: 'forest-v1',
        userId: {
          _id: 'private-user-id',
          firstName: 'Private',
          lastName: 'User',
          email: 'private@example.com',
        },
        courseId: { _id: 'course-1' },
      } as never,
      new Date('2026-07-22T08:00:00.000Z'),
    );

    expect(response).toMatchObject({
      id: 'certificate-1',
      certificateCode: 'TL-CERT-001',
      recipientName: 'Phạm Ngọc Hoàng Anh',
      course: {
        id: 'course-1',
        title: 'JavaScript Chuyên Sâu',
        slug: 'javascript-chuyen-sau',
        level: 'ADVANCED',
        language: 'javascript',
      },
      status: 'valid',
      verificationPath: '/api/v1/certificates/verify/TL-CERT-001',
      pdfPath: '/api/v1/certificates/TL-CERT-001/pdf',
    });
    expect(response).not.toHaveProperty('userId');
    expect(JSON.stringify(response)).not.toContain('private-user-id');
    expect(JSON.stringify(response)).not.toContain('private@example.com');
  });

  it('derives expired status at the expiry boundary', () => {
    const response = CertificatePresenter.toResponse(
      {
        _id: 'certificate-2',
        certificateCode: 'TL-CERT-002',
        recipientName: 'Learner',
        courseTitle: 'Course',
        courseSlug: 'course',
        courseLevel: 'BEGINNER',
        courseLanguage: 'javascript',
        completedAt: issuedAt,
        issuedAt,
        expiresAt: new Date('2026-07-22T08:00:00.000Z'),
        templateVersion: 'forest-v1',
        courseId: { _id: 'course-2' },
      } as never,
      new Date('2026-07-22T08:00:00.000Z'),
    );

    expect(response.status).toBe('expired');
  });

  it('uses the deployed frontend origin instead of localhost in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.FRONTEND_URL =
      'http://localhost:3001, https://learn.threadlearn.example/';

    const response = CertificatePresenter.toResponse({
      _id: 'certificate-3',
      certificateCode: 'TL-CERT-003',
      recipientName: 'Learner',
      courseTitle: 'Course',
      courseSlug: 'course',
      courseLevel: 'BEGINNER',
      courseLanguage: 'javascript',
      completedAt: issuedAt,
      issuedAt,
      templateVersion: 'forest-v1',
      courseId: { _id: 'course-3' },
    } as never);

    expect(response.verificationUrl).toBe(
      'https://learn.threadlearn.example/certificates/verify/TL-CERT-003',
    );
  });

  it('rejects a localhost verification origin in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.FRONTEND_URL = 'http://localhost:3001';

    expect(() =>
      CertificatePresenter.toResponse({
        _id: 'certificate-4',
        certificateCode: 'TL-CERT-004',
        recipientName: 'Learner',
        courseTitle: 'Course',
        courseSlug: 'course',
        courseLevel: 'BEGINNER',
        courseLanguage: 'javascript',
        completedAt: issuedAt,
        issuedAt,
        templateVersion: 'forest-v1',
        courseId: { _id: 'course-4' },
      } as never),
    ).toThrow('FRONTEND_URL must contain the deployed frontend origin');
  });
});
