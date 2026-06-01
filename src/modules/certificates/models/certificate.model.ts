import mongoose, { Schema, Document, Model } from 'mongoose';
import { randomBytes } from 'crypto';

/** UC58 — Chứng chỉ hoàn thành khoá học cho học viên CNTT. */
export interface ICertificate extends Document {
  userId:          mongoose.Types.ObjectId;
  courseId:        mongoose.Types.ObjectId;
  certificateCode: string;   // public, dùng để verify
  issuedAt:        Date;
  status:          'issued' | 'revoked';
}

const CertificateSchema: Schema<ICertificate> = new Schema(
  {
    userId:          { type: Schema.Types.ObjectId, ref: 'User',   required: true, index: true },
    courseId:        { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    certificateCode: {
      type: String, required: true, unique: true, index: true,
      default: () => randomBytes(8).toString('hex').toUpperCase(),
    },
    issuedAt: { type: Date, default: () => new Date() },
    status:   { type: String, enum: ['issued', 'revoked'], default: 'issued' },
  },
  { timestamps: false },
);
// 1 user chỉ có 1 cert / 1 course
CertificateSchema.index({ userId: 1, courseId: 1 }, { unique: true });

export const Certificate: Model<ICertificate> =
  mongoose.models.Certificate
  || mongoose.model<ICertificate>('Certificate', CertificateSchema);
export { CertificateSchema };
export default Certificate;
