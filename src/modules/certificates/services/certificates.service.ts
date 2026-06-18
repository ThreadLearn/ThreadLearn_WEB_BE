import crypto from 'crypto';
import { Certificate } from '../models/certificate.model';
import { NotFoundError } from '../../../common/custom-error';

export class CertificatesService {
  static async issueCertificate(userId: string, courseId: string) {
    const existing = await Certificate.findOne({ userId, courseId });
    if (existing) return existing;

    const certificateCode = crypto.randomUUID();
    return Certificate.create({
      userId,
      courseId,
      certificateCode,
      issuedAt: new Date(),
      pdfUrl: `/certificates/verify/${certificateCode}`,
    });
  }

  static async listMine(userId: string) {
    return Certificate.find({ userId })
      .populate('courseId', 'title slug thumbnailUrl level language')
      .sort({ issuedAt: -1 });
  }

  static async verify(code: string) {
    const certificate = await Certificate.findOne({ certificateCode: code })
      .populate('courseId', 'title slug')
      .populate('userId', 'firstName lastName');
    if (!certificate) throw new NotFoundError('Certificate not found.');
    return certificate;
  }
}

export default CertificatesService;
