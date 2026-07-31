import { ForbiddenError } from '../../../common/custom-error';
import { User } from '../../auth/models/user.model';
import { Course } from '../../courses/models/course.model';
import { Enrollment } from '../../enrollments/models/enrollment.model';
import { Certificate } from '../models/certificate.model';
import { CertificatesService } from './certificates.service';

describe('CertificatesService.issueCertificate', () => {
  const userId = '507f1f77bcf86cd799439011';
  const courseId = '507f1f77bcf86cd799439012';
  const completedAt = new Date('2026-07-20T08:30:00.000Z');

  function mockLeanQuery<T>(value: T) {
    return {
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(value),
      }),
    };
  }

  function mockEligibilityAndSnapshots() {
    jest.spyOn(Enrollment, 'findOne').mockReturnValue(
      mockLeanQuery({
        completedAt,
        updatedAt: new Date('2026-07-20T09:00:00.000Z'),
      }) as never,
    );
    jest.spyOn(User, 'findById').mockReturnValue(
      mockLeanQuery({ firstName: 'Nguyễn', lastName: 'Hà' }) as never,
    );
    jest.spyOn(Course, 'findById').mockReturnValue(
      mockLeanQuery({
        title: 'Lập trình JavaScript hiện đại',
        slug: 'lap-trinh-javascript-hien-dai',
        level: 'INTERMEDIATE',
        language: 'javascript',
        shortDescription: 'Master asynchronous JavaScript and concurrency patterns.',
        description: 'A complete concurrency course.',
        tags: ['promises', 'event-loop'],
        category: 'Concurrency',
        estimatedDuration: 480,
        totalLessons: 12,
      }) as never,
    );
  }

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('atomically inserts immutable completion snapshots for an eligible learner', async () => {
    mockEligibilityAndSnapshots();
    const saved = { _id: 'certificate-1' };
    const upsert = jest
      .spyOn(Certificate, 'findOneAndUpdate')
      .mockResolvedValue(saved as never);

    await expect(
      CertificatesService.issueCertificate(userId, courseId),
    ).resolves.toBe(saved);

    expect(Enrollment.findOne).toHaveBeenCalledWith({
      userId,
      courseId,
      completed: true,
    });
    expect(upsert).toHaveBeenCalledTimes(1);
    const [filter, update, options] = upsert.mock.calls[0];
    expect(filter).toEqual({ userId, courseId });
    expect(options).toEqual({
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    });
    expect(update).toEqual({
      $setOnInsert: expect.objectContaining({
        userId,
        courseId,
        certificateCode: expect.any(String),
        recipientName: 'Nguyễn Hà',
        courseTitle: 'Lập trình JavaScript hiện đại',
        courseSlug: 'lap-trinh-javascript-hien-dai',
        courseLevel: 'INTERMEDIATE',
        courseLanguage: 'javascript',
        courseDescription: 'Master asynchronous JavaScript and concurrency patterns.',
        courseTags: ['promises', 'event-loop'],
        courseCategory: 'Concurrency',
        courseEstimatedDuration: 480,
        courseTotalLessons: 12,
        completedAt,
        templateVersion: 'forest-v1',
        issuedAt: expect.any(Date),
        pdfUrl: expect.stringMatching(
          /^\/api\/v1\/certificates\/.+\/pdf$/,
        ),
      }),
    });
  });

  it('rejects issuance when no completed enrollment exists', async () => {
    jest
      .spyOn(Enrollment, 'findOne')
      .mockReturnValue(mockLeanQuery(null) as never);
    const userLookup = jest.spyOn(User, 'findById');
    const courseLookup = jest.spyOn(Course, 'findById');
    const upsert = jest.spyOn(Certificate, 'findOneAndUpdate');

    await expect(
      CertificatesService.issueCertificate(userId, courseId),
    ).rejects.toMatchObject<Partial<ForbiddenError>>({
      statusCode: 403,
      code: 'CERTIFICATE_NOT_ELIGIBLE',
    });
    expect(userLookup).not.toHaveBeenCalled();
    expect(courseLookup).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });

  it('recovers an upsert duplicate-key race by returning the winning certificate', async () => {
    mockEligibilityAndSnapshots();
    const duplicateKey = Object.assign(new Error('duplicate key'), { code: 11000 });
    jest
      .spyOn(Certificate, 'findOneAndUpdate')
      .mockRejectedValue(duplicateKey);
    const winner = { _id: 'certificate-winner', userId, courseId };
    jest.spyOn(Certificate, 'findOne').mockResolvedValue(winner as never);

    await expect(
      CertificatesService.issueCertificate(userId, courseId),
    ).resolves.toBe(winner);
    expect(Certificate.findOne).toHaveBeenCalledWith({ userId, courseId });
  });
});
