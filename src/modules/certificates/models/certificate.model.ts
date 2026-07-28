import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ICertificate extends Document {
  userId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  certificateCode: string;
  recipientName: string;
  courseTitle: string;
  courseSlug: string;
  courseLevel: string;
  courseLanguage: string;
  courseDescription?: string;
  courseTags: string[];
  courseCategory?: string;
  courseEstimatedDuration?: number;
  courseTotalLessons?: number;
  completedAt: Date;
  templateVersion: string;
  pdfUrl?: string;
  issuedAt: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CertificateSchema = new Schema<ICertificate>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    certificateCode: { type: String, required: true, unique: true, index: true },
    recipientName: { type: String, required: true, trim: true },
    courseTitle: { type: String, required: true, trim: true },
    courseSlug: { type: String, required: true, trim: true },
    courseLevel: { type: String, required: true, trim: true },
    courseLanguage: { type: String, required: true, trim: true },
    courseDescription: { type: String, trim: true },
    courseTags: { type: [String], default: [] },
    courseCategory: { type: String, trim: true },
    courseEstimatedDuration: { type: Number, min: 0 },
    courseTotalLessons: { type: Number, min: 0 },
    completedAt: { type: Date, required: true },
    templateVersion: { type: String, required: true, default: 'forest-v1' },
    pdfUrl: { type: String },
    issuedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

CertificateSchema.index({ userId: 1, courseId: 1 }, { unique: true });

export const Certificate: Model<ICertificate> =
  mongoose.models.Certificate ||
  mongoose.model<ICertificate>('Certificate', CertificateSchema);

export default Certificate;
