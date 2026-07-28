import { CertificateResponse } from '../presentation/certificate.presenter';
import { CertificatePdfService } from './certificate-pdf.service';

describe('CertificatePdfService', () => {
  it('renders a real one-page PDF buffer with Vietnamese content support', async () => {
    const certificateFixture: CertificateResponse = {
      id: 'certificate-1',
      certificateCode: 'TL-CERT-VI-001',
      recipientName: 'Phạm Ngọc Hoàng Anh',
      course: {
        id: 'course-1',
        title: 'Lập trình bất đồng bộ nâng cao',
        slug: 'lap-trinh-bat-dong-bo-nang-cao',
        level: 'ADVANCED',
        language: 'javascript',
        description:
          'Develop reliable asynchronous programs using event loops, promises, workers, and synchronization techniques.',
        tags: ['event-loop', 'promises', 'workers', 'atomics'],
        category: 'Concurrency',
        estimatedDuration: 720,
        totalLessons: 18,
      },
      issuedAt: new Date('2026-07-21T08:00:00.000Z'),
      completedAt: new Date('2026-07-20T08:00:00.000Z'),
      expiresAt: null,
      status: 'valid',
      templateVersion: 'forest-v1',
      verificationPath: '/api/v1/certificates/verify/TL-CERT-VI-001',
      verificationUrl:
        'http://localhost:3001/certificates/verify/TL-CERT-VI-001',
      pdfPath: '/api/v1/certificates/TL-CERT-VI-001/pdf',
    };
    const pdf = await CertificatePdfService.render(certificateFixture);

    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(10_000);
    expect(pdf.toString('latin1')).toContain('/Type /Page');
    expect(pdf.toString('latin1')).toContain('NotoSans');
  });
});
