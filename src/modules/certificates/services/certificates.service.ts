import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ICertificate } from '../models/certificate.model';
import { NotFoundError } from '../../../common/custom-error';

@Injectable()
export class CertificatesService {
  constructor(
    @InjectModel('Certificate') private certModel:   Model<ICertificate>,
    @InjectModel('Course')      private courseModel: Model<any>,
    @InjectModel('User')        private userModel:   Model<any>,
  ) {}

  /** Issue certificate khi student hoàn thành course 100%. Idempotent. */
  async issueIfEligible(userId: string, courseId: string): Promise<ICertificate> {
    const existing = await this.certModel.findOne({ userId, courseId });
    if (existing) return existing;

    try {
      return await this.certModel.create({ userId, courseId });
    } catch (err: any) {
      // E11000 race — fetch the existing one
      if (err?.code === 11000) {
        const existing2 = await this.certModel.findOne({ userId, courseId });
        if (existing2) return existing2;
      }
      throw err;
    }
  }

  async getMyCertificates(userId: string) {
    return this.certModel.find({ userId, status: 'issued' })
      .populate('courseId', 'title thumbnailUrl level')
      .sort({ issuedAt: -1 })
      .lean();
  }

  /** Public — verify by certificateCode (no auth). */
  async verifyByCode(code: string) {
    const cert = await this.certModel.findOne({
      certificateCode: code.toUpperCase(), status: 'issued',
    }).populate('courseId', 'title').populate('userId', 'firstName lastName').lean<any>();
    if (!cert) throw new NotFoundError('Certificate not found or revoked.');
    return {
      certificateCode: cert.certificateCode,
      issuedAt:        cert.issuedAt,
      holderName:      `${cert.userId.firstName ?? ''} ${cert.userId.lastName ?? ''}`.trim(),
      courseTitle:     cert.courseId.title,
    };
  }
}
